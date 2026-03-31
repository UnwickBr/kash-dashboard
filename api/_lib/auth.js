import crypto from "node:crypto";
import { ensureSchema, getSql } from "./db.js";
import { makeId, nowIso } from "./utils.js";

const hashPassword = (password, salt) =>
  crypto.scryptSync(password, salt, 64).toString("hex");

export const sanitizeUser = (user) => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  role: user.role,
  subscription_status: user.subscription_status,
  created_date: user.created_at || user.created_date,
});

export const createSession = async (userId) => {
  await ensureSchema();
  const sql = getSql();
  const token = crypto.randomBytes(24).toString("hex");
  await sql`
    INSERT INTO sessions (token, user_id, created_at)
    VALUES (${token}, ${userId}, ${nowIso()})
  `;
  return token;
};

export const getTokenFromRequest = (req) => {
  const authorization = req.headers.authorization || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
};

export const getUserFromRequest = async (req) => {
  await ensureSchema();
  const sql = getSql();
  const token = getTokenFromRequest(req);
  if (!token) {
    return null;
  }

  const rows = await sql`
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.role,
      u.subscription_status,
      u.created_at
    FROM sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
    LIMIT 1
  `;

  return rows[0] || null;
};

export const requireAuth = async (req) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    const error = new Error("Sessão inválida ou expirada.");
    error.status = 401;
    throw error;
  }
  return user;
};

export const requireAdmin = (user) => {
  if (user.role !== "admin") {
    const error = new Error("Acesso restrito a administradores.");
    error.status = 403;
    throw error;
  }
};

export const registerUser = async ({ fullName, email, password }) => {
  await ensureSchema();
  const sql = getSql();
  const normalizedEmail = String(email).trim().toLowerCase();
  const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1`;
  if (existing.length) {
    const error = new Error("Já existe uma conta com esse email.");
    error.status = 409;
    throw error;
  }

  const countRows = await sql`SELECT COUNT(*)::int AS count FROM users`;
  const isFirstUser = Number(countRows[0]?.count || 0) === 0;
  const id = makeId("user");
  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const createdAt = nowIso();

  const rows = await sql`
    INSERT INTO users (
      id,
      full_name,
      email,
      role,
      subscription_status,
      password_hash,
      password_salt,
      created_at
    )
    VALUES (
      ${id},
      ${String(fullName).trim()},
      ${normalizedEmail},
      ${isFirstUser ? "admin" : "user"},
      ${isFirstUser ? "active" : "inactive"},
      ${passwordHash},
      ${salt},
      ${createdAt}
    )
    RETURNING id, full_name, email, role, subscription_status, created_at
  `;

  return rows[0];
};

export const loginUser = async ({ email, password }) => {
  await ensureSchema();
  const sql = getSql();
  const normalizedEmail = String(email).trim().toLowerCase();
  const rows = await sql`
    SELECT *
    FROM users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `;

  const user = rows[0];
  if (!user) {
    const error = new Error("Email ou senha inválidos.");
    error.status = 401;
    throw error;
  }

  const suppliedHash = hashPassword(password, user.password_salt);
  const match = crypto.timingSafeEqual(
    Buffer.from(user.password_hash, "hex"),
    Buffer.from(suppliedHash, "hex")
  );

  if (!match) {
    const error = new Error("Email ou senha inválidos.");
    error.status = 401;
    throw error;
  }

  return user;
};

export const logoutSession = async (token) => {
  if (!token) return;
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM sessions WHERE token = ${token}`;
};
