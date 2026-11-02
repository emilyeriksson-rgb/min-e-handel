import { z } from "zod";
import pool from "../config/db.js";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setAuthCookie,
  clearAuthCookie,
} from "../services/authService.js";

const EmailSchema = z.string()
  .trim()
  .max(254)
  .toLowerCase()
  .pipe(z.email());

const PasswordSchema = z.string().min(12).max(128);

const LoginSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
}).strict();

const RegisterSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
}).strict();

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
  };
}

// Även okända användare får en lösenordsverifiering.
// Det minskar tidsskillnaden mot ett felaktigt lösenord.
let dummyHashPromise;

function getDummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword(
      "Kursrum dummy password for verification only!"
    ).catch((error) => {
      dummyHashPromise = undefined;
      throw error;
    });
  }

  return dummyHashPromise;
}

export async function register(req, res) {
  const parsed = RegisterSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      code: "INVALID_REGISTRATION",
      message:
        "Ange namn, giltig e-postadress och ett lösenord med 12–128 tecken.",
    });
  }

  const input = parsed.data;

  try {
    const passwordHash = await hashPassword(input.password);

    const result = await pool.query(
      `INSERT INTO users (
         email,
         password_hash,
         first_name,
         last_name,
         role
       )
       VALUES ($1, $2, $3, $4, 'customer')
       RETURNING id, email, first_name, last_name, role`,
      [
        input.email,
        passwordHash,
        input.first_name,
        input.last_name,
      ]
    );

    return res.status(201).json({
      user: publicUser(result.rows[0]),
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        code: "EMAIL_IN_USE",
        message: "E-postadressen är redan registrerad.",
      });
    }

    return res.status(503).json({
      code: "AUTH_UNAVAILABLE",
      message: "Kontot kunde inte skapas just nu.",
    });
  }
}

export async function login(req, res) {
  const parsed = LoginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      code: "INVALID_LOGIN",
      message: "Ange giltiga inloggningsuppgifter.",
    });
  }

  const input = parsed.data;

  try {
    const result = await pool.query(
      `SELECT
         id,
         email,
         password_hash,
         first_name,
         last_name,
         role,
         is_active
       FROM users
       WHERE LOWER(TRIM(email)) = $1`,
      [input.email]
    );

    const user = result.rows[0];

    const passwordHash = user
      ? user.password_hash
      : await getDummyHash();

    const passwordMatches = await verifyPassword(
      input.password,
      passwordHash
    );

    if (!user || !user.is_active || !passwordMatches) {
      return res.status(401).json({
        code: "INVALID_CREDENTIALS",
        message: "Fel e-postadress eller lösenord.",
      });
    }

    const session = await createSessionToken(user.id);

    await pool.query(
      `INSERT INTO auth_sessions (
         id,
         user_id,
         expires_at
       )
       VALUES ($1, $2, $3)`,
      [
        session.sessionId,
        user.id,
        session.expiresAt,
      ]
    );

    setAuthCookie(res, session.token);

    return res.json({
      user: publicUser(user),
    });
  } catch {
    return res.status(503).json({
      code: "AUTH_UNAVAILABLE",
      message: "Inloggningen kunde inte genomföras just nu.",
    });
  }
}

export async function logout(req, res) {
  try {
    if (req.authSessionId) {
      await pool.query(
        `UPDATE auth_sessions
         SET revoked_at = NOW()
         WHERE id = $1
           AND user_id = $2
           AND revoked_at IS NULL`,
        [req.authSessionId, req.user.id]
      );
    }

    clearAuthCookie(res);
    return res.status(204).end();
  } catch {
    return res.status(503).json({
      code: "AUTH_UNAVAILABLE",
      message: "Utloggningen kunde inte genomföras just nu.",
    });
  }
}

export function getMe(req, res) {
  return res.json({
    user: publicUser(req.user),
  });
}