import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import pool from "../config/db.js";

import {
  createGitHubLoginUrl,
  exchangeGitHubCodeForToken,
  getGitHubUser,
} from "../integrations/githubAdapter.js";

import {
  createSessionToken,
  setAuthCookie,
} from "../services/authService.js";

const COOKIE_NAME = "kursrum_github_attempt";
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
    path: "/api/auth/github",
  };
}

function frontendUrl(path) {
  return new URL(path, process.env.FRONTEND_URL);
}

function redirectWithError(res, message) {
  const url = frontendUrl("/admin/login");
  url.searchParams.set("github_error", message);

  return res.redirect(url.toString());
}

// Tom adminlista innebär att ingen får behörighet.
function isAllowedAdmin(login) {
  const allowedLogins = (
    process.env.ADMIN_GITHUB_LOGINS || ""
  )
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return allowedLogins.includes(login.toLowerCase());
}

// Startar inloggningen och sparar säkerhetsvärdena.
export async function startGitHubLogin(req, res) {
  try {
    const id = randomValue();
    const state = randomValue();
    const codeVerifier = randomValue();

    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const loginUrl = createGitHubLoginUrl({
      state,
      codeChallenge,
    });

    await pool.query(
      `DELETE FROM github_login_attempts
       WHERE expires_at <= NOW()`
    );

    await pool.query(
      `INSERT INTO github_login_attempts (
         id,
         state,
         code_verifier,
         expires_at
       )
       VALUES ($1, $2, $3, $4)`,
      [
        id,
        state,
        codeVerifier,
        new Date(Date.now() + ATTEMPT_DURATION_MS),
      ]
    );

    res.cookie(COOKIE_NAME, id, {
      ...cookieOptions(),
      maxAge: ATTEMPT_DURATION_MS,
    });

    return res.redirect(loginUrl);
  } catch {
    return redirectWithError(
      res,
      "GitHub-inloggningen kunde inte startas. Försök igen."
    );
  }
}

// Anropas först efter kontrollen av adminlistan.
async function saveGitHubAdmin(profile) {
  const nameParts = profile.name.trim().split(/\s+/);
  const firstName = nameParts.shift().slice(0, 100);
  const lastName = nameParts.join(" ").slice(0, 100) || "—";

  const result = await pool.query(
    `INSERT INTO users (
       github_id,
       github_login,
       first_name,
       last_name,
       email,
       password_hash,
       role
     )
     VALUES ($1, $2, $3, $4, NULL, NULL, 'admin')
     ON CONFLICT (github_id)
     DO UPDATE SET
       github_login = EXCLUDED.github_login,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       role = 'admin'
     RETURNING id, is_active`,
    [
      profile.githubId,
      profile.login,
      firstName,
      lastName,
    ]
  );

  return result.rows[0];
}

// Tar emot svaret från GitHub.
export async function githubCallback(req, res) {
  const attemptId = req.cookies?.[COOKIE_NAME];

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
    // Försöket kontrolleras och förbrukas samtidigt.
    const result = await pool.query(
      `DELETE FROM github_login_attempts
       WHERE id = $1
         AND state = $2
         AND expires_at > NOW()
       RETURNING code_verifier`,
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
          ? "GitHub-inloggningen avbröts."
          : "GitHub kunde inte genomföra inloggningen."
      );
    }

    const parsedCode = CodeSchema.safeParse(req.query.code);

    if (!parsedCode.success) {
      return redirectWithError(
        res,
        "GitHub skickade inget giltigt inloggningssvar."
      );
    }

    const accessToken = await exchangeGitHubCodeForToken({
      code: parsedCode.data,
      codeVerifier: attempt.code_verifier,
    });

    const profile = await getGitHubUser(accessToken);

    if (!isAllowedAdmin(profile.login)) {
      return redirectWithError(
        res,
        "Ditt GitHub-konto har inte administratörsbehörighet."
      );
    }

    const user = await saveGitHubAdmin(profile);

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

    return res.redirect(frontendUrl("/admin").toString());
  } catch {
    return redirectWithError(
      res,
      "GitHub-inloggningen misslyckades. Försök igen."
    );
  }
}