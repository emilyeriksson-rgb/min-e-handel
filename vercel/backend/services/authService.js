import "dotenv/config";
import { randomUUID } from "node:crypto";
import * as argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";

export const AUTH_COOKIE_NAME = "kursrum_auth";
export const SESSION_DURATION_SECONDS = 60 * 60;

const JWT_ISSUER = "kursrum-api";
const JWT_AUDIENCE = "kursrum-web";

const PasswordSchema = z.string().min(12).max(128);

const UserIdSchema = z.number()
  .int()
  .positive()
  .max(2147483647);

const TokenClaimsSchema = z.object({
  sub: z.string()
    .regex(/^[1-9]\d{0,9}$/)
    .transform(Number)
    .pipe(UserIdSchema),

  jti: z.uuid(),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
});

function authError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getSigningKey() {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || !/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw authError(
      "Inloggningen är inte tillgänglig just nu.",
      503
    );
  }

  return Buffer.from(secret, "hex");
}

export async function hashPassword(password) {
  const result = PasswordSchema.safeParse(password);

  if (!result.success) {
    throw authError(
      "Lösenordet ska innehålla mellan 12 och 128 tecken.",
      400
    );
  }

  return argon2.hash(result.data, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(password, passwordHash) {
  if (
    !PasswordSchema.safeParse(password).success ||
    typeof passwordHash !== "string"
  ) {
    return false;
  }

  return argon2.verify(passwordHash, password);
}

export async function createSessionToken(userId) {
  const validatedUserId = UserIdSchema.parse(userId);
  const key = getSigningKey();

  const sessionId = randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SESSION_DURATION_SECONDS;

  const token = await new SignJWT({})
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setSubject(String(validatedUserId))
    .setJti(sessionId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(key);

  return {
    token,
    sessionId,
    expiresAt: new Date(expiresAt * 1000),
  };
}

export async function verifySessionToken(token) {
  // Konfigurationsfel ska inte presenteras som felaktig inloggning.
  const key = getSigningKey();

  try {
    if (
      typeof token !== "string" ||
      token.length === 0 ||
      token.length > 4096
    ) {
      throw new Error("Invalid token");
    }

    const { payload, protectedHeader } = await jwtVerify(
      token,
      key,
      {
        algorithms: ["HS256"],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        requiredClaims: ["sub", "jti", "iat", "exp"],
        maxTokenAge: SESSION_DURATION_SECONDS,
        clockTolerance: 5,
      }
    );

    if (protectedHeader.typ !== "JWT") {
      throw new Error("Invalid token type");
    }

    const claims = TokenClaimsSchema.parse(payload);

    return {
      userId: claims.sub,
      sessionId: claims.jti,
    };
  } catch {
    throw authError(
      "Din inloggning är ogiltig eller har gått ut.",
      401
    );
  }
}

function getCookieOptions() {
  return {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" ||
      process.env.VERCEL === "1",
    sameSite: "lax",
    path: "/",
  };
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...getCookieOptions(),
    maxAge: SESSION_DURATION_SECONDS * 1000,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(
    AUTH_COOKIE_NAME,
    getCookieOptions()
  );
}