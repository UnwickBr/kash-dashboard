import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { ensureSchema, getSql } from "./db.js";
import { makeId, nowIso } from "./utils.js";

const hashPassword = (password, salt) =>
  crypto.scryptSync(password, salt, 64).toString("hex");

let googleClient = null;

const getGoogleClientId = () => process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || null;

const getGoogleClient = () => {
  const clientId = getGoogleClientId();
  if (!clientId) {
    const error = new Error("GOOGLE_CLIENT_ID não configurado.");
    error.status = 500;
    throw error;
  }

  if (!googleClient) {
    googleClient = new OAuth2Client(clientId);
  }

  return googleClient;
};

const addDaysIso = (dateLike, days) => {
  const baseDate = dateLike ? new Date(dateLike) : new Date();
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
};

export const hasPremiumAccess = (user) => {
  if (!user) return false;
  if (user.role === "admin" || user.role === "premium") {
    return true;
  }
  if (user.subscription_status !== "active") {
    return false;
  }
  if (!user.subscription_expires_at) {
    return true;
  }
  return new Date(user.subscription_expires_at).getTime() > Date.now();
};

export const createPasswordHash = (password, salt = crypto.randomBytes(16).toString("hex")) => ({
  salt,
  passwordHash: hashPassword(password, salt),
});

export const verifyPassword = (password, user) => {
  const suppliedHash = hashPassword(password, user.password_salt);
  return crypto.timingSafeEqual(
    Buffer.from(user.password_hash, "hex"),
    Buffer.from(suppliedHash, "hex")
  );
};

export const sanitizeUser = (user) => ({
  id: user.id,
  full_name: user.full_name,
  email: user.email,
  birth_date: user.birth_date,
  auth_provider: user.auth_provider,
  email_verified: user.email_verified,
  role: user.role,
  subscription_status: user.subscription_status,
  subscription_started_at: user.subscription_started_at,
  subscription_expires_at: user.subscription_expires_at,
  subscription_canceled_at: user.subscription_canceled_at,
  asaas_customer_id: user.asaas_customer_id,
  asaas_subscription_id: user.asaas_subscription_id,
  asaas_checkout_id: user.asaas_checkout_id,
  has_premium_access: hasPremiumAccess(user),
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
      u.birth_date,
      u.auth_provider,
      u.google_sub,
      u.email_verified,
      u.email_verified_at,
      u.role,
      u.subscription_status,
      u.subscription_started_at,
      u.subscription_expires_at,
      u.subscription_canceled_at,
      u.asaas_customer_id,
      u.asaas_subscription_id,
      u.asaas_checkout_id,
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

export const registerUser = async ({ fullName, email, password, birthDate }) => {
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
  const { salt, passwordHash } = createPasswordHash(password);
  const createdAt = nowIso();

  const rows = await sql`
    INSERT INTO users (
      id,
      full_name,
      email,
      birth_date,
      auth_provider,
      google_sub,
      email_verified,
      email_verified_at,
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
      ${birthDate || null},
      ${"local"},
      ${null},
      ${false},
      ${null},
      ${isFirstUser ? "admin" : "user"},
      ${isFirstUser ? "active" : "inactive"},
      ${isFirstUser ? createdAt : null},
      ${isFirstUser ? addDaysIso(createdAt, 30) : null},
      ${null},
      ${passwordHash},
      ${salt},
      ${createdAt}
    )
    RETURNING *
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

  if (!verifyPassword(password, user)) {
    const error = new Error("Email ou senha inválidos.");
    error.status = 401;
    throw error;
  }

  if (!user.email_verified) {
    const error = new Error("Confirme seu email antes de entrar.");
    error.status = 403;
    error.payload = {
      code: "email_not_verified",
      email: user.email,
    };
    throw error;
  }

  return user;
};

export const verifyGoogleCredential = async (credential) => {
  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: getGoogleClientId(),
  });

  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email || !payload?.email_verified) {
    const error = new Error("Não foi possível validar a conta Google.");
    error.status = 401;
    throw error;
  }

  return payload;
};

export const findOrCreateGoogleUser = async (payload) => {
  await ensureSchema();
  const sql = getSql();
  const normalizedEmail = String(payload.email).trim().toLowerCase();
  const verifiedAt = nowIso();

  const existingByGoogle = await sql`
    SELECT *
    FROM users
    WHERE google_sub = ${payload.sub}
    LIMIT 1
  `;

  if (existingByGoogle.length) {
    if (!existingByGoogle[0].email_verified) {
      const rows = await sql`
        UPDATE users
        SET
          email_verified = TRUE,
          email_verified_at = ${verifiedAt},
          email_verification_token = NULL
        WHERE id = ${existingByGoogle[0].id}
        RETURNING *
      `;
      return rows[0];
    }
    return existingByGoogle[0];
  }

  const existingByEmail = await sql`
    SELECT *
    FROM users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `;

  if (existingByEmail.length) {
    const rows = await sql`
      UPDATE users
      SET
        google_sub = ${payload.sub},
        auth_provider = CASE WHEN auth_provider = 'local' THEN auth_provider ELSE 'google' END,
        email_verified = TRUE,
        email_verified_at = ${verifiedAt},
        email_verification_token = NULL
      WHERE id = ${existingByEmail[0].id}
      RETURNING *
    `;
    return rows[0];
  }

  const countRows = await sql`SELECT COUNT(*)::int AS count FROM users`;
  const isFirstUser = Number(countRows[0]?.count || 0) === 0;
  const id = makeId("user");
  const { salt, passwordHash } = createPasswordHash(crypto.randomBytes(32).toString("hex"));
  const createdAt = nowIso();
  const fullName = String(payload.name || payload.given_name || normalizedEmail.split("@")[0]).trim();

  const rows = await sql`
    INSERT INTO users (
      id,
      full_name,
      email,
      birth_date,
      auth_provider,
      google_sub,
      email_verified,
      email_verified_at,
      role,
      subscription_status,
      subscription_started_at,
      subscription_expires_at,
      subscription_canceled_at,
      password_hash,
      password_salt,
      created_at
    )
    VALUES (
      ${id},
      ${fullName},
      ${normalizedEmail},
      ${null},
      ${"google"},
      ${payload.sub},
      ${true},
      ${verifiedAt},
      ${isFirstUser ? "admin" : "user"},
      ${isFirstUser ? "active" : "inactive"},
      ${isFirstUser ? createdAt : null},
      ${isFirstUser ? addDaysIso(createdAt, 30) : null},
      ${null},
      ${passwordHash},
      ${salt},
      ${createdAt}
    )
    RETURNING *
  `;

  return rows[0];
};

export const verifyEmailToken = async (token) => {
  await ensureSchema();
  const sql = getSql();
  const verifiedAt = nowIso();
  const rows = await sql`
    UPDATE users
    SET
      email_verified = TRUE,
      email_verified_at = ${verifiedAt},
      email_verification_token = NULL
    WHERE email_verification_token = ${token}
    RETURNING *
  `;

  if (!rows.length) {
    const error = new Error("Link de verificação inválido ou expirado.");
    error.status = 400;
    throw error;
  }

  return rows[0];
};

export const findUnverifiedUserByEmail = async (email) => {
  await ensureSchema();
  const sql = getSql();
  const normalizedEmail = String(email).trim().toLowerCase();
  const rows = await sql`
    SELECT *
    FROM users
    WHERE email = ${normalizedEmail}
      AND email_verified = FALSE
    LIMIT 1
  `;
  return rows[0] || null;
};

export const logoutSession = async (token) => {
  if (!token) return;
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM sessions WHERE token = ${token}`;
};
