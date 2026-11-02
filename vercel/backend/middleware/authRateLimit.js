import "dotenv/config";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { ipKeyGenerator } from "express-rate-limit";
import pool from "../config/db.js";

function getClientIpKey(req) {
  const address = process.env.VERCEL === "1"
    ? (
        req.get("x-vercel-forwarded-for") ||
        req.get("x-forwarded-for")
      )
    : req.socket?.remoteAddress;

  const ip = address?.split(",")[0].trim();

  if (!ip || !isIP(ip)) {
    throw new Error("Client IP unavailable");
  }

  return ipKeyGenerator(ip, 56);
}

function createBucketKey(scope, identifier) {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || !/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw new Error("Authentication configuration unavailable");
  }

  const digest = createHmac(
    "sha256",
    Buffer.from(secret, "hex")
  )
    .update(`${scope}:${identifier}`)
    .digest("hex");

  return `${scope}:${digest}`;
}

function createAuthLimiter({
  scope,
  limit,
  windowSeconds,
  getIdentifier,
}) {
  return async function authRateLimit(req, res, next) {
    try {
      const identifier = getIdentifier(req);
      const bucketKey = createBucketKey(scope, identifier);

      const result = await pool.query(
        `INSERT INTO auth_rate_limits (
           bucket_key,
           attempts,
           resets_at
         )
         VALUES (
           $1,
           1,
           NOW() + ($2::INTEGER * INTERVAL '1 second')
         )
         ON CONFLICT (bucket_key)
         DO UPDATE SET
           attempts = CASE
             WHEN auth_rate_limits.resets_at <= NOW()
               THEN 1
             ELSE LEAST(
               auth_rate_limits.attempts + 1,
               $3::INTEGER + 1
             )
           END,
           resets_at = CASE
             WHEN auth_rate_limits.resets_at <= NOW()
               THEN NOW() + (
                 $2::INTEGER * INTERVAL '1 second'
               )
             ELSE auth_rate_limits.resets_at
           END
         RETURNING
           attempts,
           GREATEST(
             1,
             CEIL(
               EXTRACT(EPOCH FROM resets_at - NOW())
             )
           )::INTEGER AS retry_after`,
        [bucketKey, windowSeconds, limit]
      );

      const bucket = result.rows[0];

      if (bucket.attempts > limit) {
        res.set("Retry-After", String(bucket.retry_after));

        return res.status(429).json({
          code: "RATE_LIMITED",
          message:
            "För många försök. Vänta en stund innan du försöker igen.",
        });
      }

      return next();
    } catch {
      return res.status(503).json({
        code: "AUTH_UNAVAILABLE",
        message:
          "Inloggning och registrering är tillfälligt otillgängliga.",
      });
    }
  };
}

export const loginIpLimit = createAuthLimiter({
  scope: "login-ip",
  limit: 30,
  windowSeconds: 15 * 60,
  getIdentifier: getClientIpKey,
});

export const loginEmailLimit = createAuthLimiter({
  scope: "login-email",
  limit: 10,
  windowSeconds: 15 * 60,
  getIdentifier: (req) =>
    typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase().slice(0, 254)
      : "invalid-email",
});

export const registerIpLimit = createAuthLimiter({
  scope: "register-ip",
  limit: 5,
  windowSeconds: 60 * 60,
  getIdentifier: getClientIpKey,
});