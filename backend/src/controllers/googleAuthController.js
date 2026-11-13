import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import pool from "../config/db.js";

import {
  createGoogleLoginUrl,
  exchangeCodeForTokens,
  verifyGoogleIdToken,
} from "../integrations/googleAuthAdapter.js";

import {
  createSessionToken,
  setAuthCookie,
} from "../services/authService.js";

const COOKIE_NAME = "kursrum_google_attempt";
const ATTEMPT_DURATION_MS = 10 * 60 * 1000;

const RandomValueSchema = z.string()
  .regex(/^[A-Za-z0-9_-]{43}$/);

const CodeSchema = z.string().min(1).max(4096);

function randomValue() {
  return randomBytes(32).toString("base64url");
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" ||
      process.env.VERCEL === "1",
    sameSite: "lax",
    path: "/api/auth/google",
  };
}

function frontendUrl(path) {
  return new URL(path, process.env.FRONTEND_URL);
}

function redirectWithError(res, message) {
  const url = frontendUrl("/logga-in");
  url.searchParams.set("google_error", message);

  return res.redirect(url.toString());
}

// Startar ett nytt inloggningsförsök.
export async function startGoogleLogin(req, res) {
  try {
    const id = randomValue();
    const state = randomValue();
    const codeVerifier = randomValue();
    const nonce = randomValue();

    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const loginUrl = createGoogleLoginUrl({
      state,
      codeChallenge,
      nonce,
    });

    // Städar bort gamla försök.
    await pool.query(
      `DELETE FROM google_login_attempts
       WHERE expires_at <= NOW()`
    );

    await pool.query(
      `INSERT INTO google_login_attempts (
         id,
         state,
         code_verifier,
         nonce,
         expires_at
       )
       VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        state,
        codeVerifier,
        nonce,
        new Date(Date.now() + ATTEMPT_DURATION_MS),
      ]
    );

    res.cookie(COOKIE_NAME, id, {
      ...cookieOptions(),
      maxAge: ATTEMPT_DURATION_MS,
    });

    return res.redirect(loginUrl);
   } catch (error) {
    console.error("Google-start misslyckades:", {
      errorType: error.name,
      errorCode: error.code,
      hasClientId: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
      hasClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
      hasRedirectUri: Boolean(process.env.GOOGLE_REDIRECT_URI?.trim()),
    });

    return redirectWithError(
      res,
      "Google-inloggningen kunde inte startas. Försök igen."
    );
  }
}

// Hittar kunden via Googles sub eller skapar en ny kund.
async function findOrCreateGoogleUser(profile) {
  const existing = await pool.query(
    `SELECT id, is_active
     FROM users
     WHERE google_sub = $1`,
    [profile.googleSub]
  );

  if (existing.rows.length) {
    return existing.rows[0];
  }

  const nameParts = profile.name.split(/\s+/);
  const firstName = nameParts.shift().slice(0, 100);

  // Din databas kräver ett efternamn även om Google
  // bara skickar ett namn.
  const lastName = nameParts.join(" ").slice(0, 100) || "—";

  const result = await pool.query(
    `INSERT INTO users (
       google_sub,
       email,
       first_name,
       last_name,
       password_hash,
       role
     )
     VALUES ($1, $2, $3, $4, NULL, 'customer')
     ON CONFLICT (google_sub)
     DO UPDATE SET google_sub = EXCLUDED.google_sub
     RETURNING id, is_active`,
    [
      profile.googleSub,
      profile.email.trim().toLowerCase(),
      firstName,
      lastName,
    ]
  );

  return result.rows[0];
}

// Tar emot kunden när Google skickar tillbaka webbläsaren.
export async function googleCallback(req, res) {
  const attemptId = req.cookies?.[COOKIE_NAME];

  // Den tillfälliga cookien behövs inte efter callbacken.
  res.clearCookie(COOKIE_NAME, cookieOptions());

  const parsedId = RandomValueSchema.safeParse(attemptId);
  const parsedState = RandomValueSchema.safeParse(req.query.state);

  if (!parsedId.success || !parsedState.success) {
    return redirectWithError(
      res,
      "Inloggningen kunde inte verifieras. Börja om."
    );
  }

  try {
    // DELETE och RETURNING gör försöket till en engångsbiljett.
    const result = await pool.query(
      `DELETE FROM google_login_attempts
       WHERE id = $1
         AND state = $2
         AND expires_at > NOW()
       RETURNING code_verifier, nonce`,
      [parsedId.data, parsedState.data]
    );

    const attempt = result.rows[0];

    if (!attempt) {
      return redirectWithError(
        res,
        "Inloggningen är ogiltig eller har gått ut. Börja om."
      );
    }

    if (req.query.error !== undefined) {
      return redirectWithError(
        res,
        req.query.error === "access_denied"
          ? "Google-inloggningen avbröts."
          : "Google kunde inte genomföra inloggningen."
      );
    }

    const parsedCode = CodeSchema.safeParse(req.query.code);

    if (!parsedCode.success) {
      return redirectWithError(
        res,
        "Google skickade inget giltigt inloggningssvar."
      );
    }

    const idToken = await exchangeCodeForTokens({
      code: parsedCode.data,
      codeVerifier: attempt.code_verifier,
    });

    const profile = await verifyGoogleIdToken(
      idToken,
      attempt.nonce
    );

    const user = await findOrCreateGoogleUser(profile);

    if (!user.is_active) {
      return redirectWithError(
        res,
        "Kontot är inaktiverat."
      );
    }

    const session = await createSessionToken(user.id);

    await pool.query(
      `INSERT INTO auth_sessions (
         id,
         user_id,
         expires_at
       )
       VALUES ($1, $2, $3)`,
      [session.sessionId, user.id, session.expiresAt]
    );

    setAuthCookie(res, session.token);

    return res.redirect(
      frontendUrl("/mitt-konto").toString()
    );
  } catch (error) {
    if (error.code === "23505") {
      return redirectWithError(
        res,
        "E-postadressen används redan av ett annat konto. " +
        "Logga in med ditt befintliga inloggningssätt."
      );
    }

    return redirectWithError(
      res,
      "Google-inloggningen misslyckades. Försök igen."
    );
  }
}