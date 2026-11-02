import pool from "../config/db.js";
import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  verifySessionToken,
} from "../services/authService.js";

export async function optionalAuth(req, res, next) {
  req.user = null;
  req.authSessionId = null;

  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    return next();
  }

  try {
    const { userId, sessionId } =
      await verifySessionToken(token);

    const result = await pool.query(
      `SELECT
         u.id,
         u.email,
         u.first_name,
         u.last_name,
         u.role
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = $1
         AND s.user_id = $2
         AND s.revoked_at IS NULL
         AND s.expires_at > NOW()
         AND u.is_active = TRUE`,
      [sessionId, userId]
    );

    if (!result.rows.length) {
      clearAuthCookie(res);
      return next();
    }

    req.user = result.rows[0];
    req.authSessionId = sessionId;

    return next();
  } catch (error) {
    if (error.status === 401) {
      clearAuthCookie(res);
      return next();
    }

    return res.status(503).json({
      code: "AUTH_UNAVAILABLE",
      message:
        "Inloggningen kan inte kontrolleras just nu. Försök igen.",
    });
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      code: "AUTH_REQUIRED",
      message: "Du behöver logga in.",
    });
  }

  return next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      code: "AUTH_REQUIRED",
      message: "Du behöver logga in.",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      code: "ADMIN_REQUIRED",
      message: "Du saknar behörighet.",
    });
  }

  return next();
}

export function requireTrustedOrigin(req, res, next) {
  let allowedOrigin;

  try {
    allowedOrigin = new URL(
      process.env.FRONTEND_URL
    ).origin;
  } catch {
    return res.status(503).json({
      code: "AUTH_UNAVAILABLE",
      message: "Inloggningen är inte tillgänglig just nu.",
    });
  }

  if (req.get("Origin") !== allowedOrigin) {
    return res.status(403).json({
      code: "INVALID_ORIGIN",
      message: "Anropet kommer inte från en tillåten webbplats.",
    });
  }

  return next();
}

export function protectAdminWrites(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  return requireAdmin(req, res, () =>
    requireTrustedOrigin(req, res, next)
  );
}