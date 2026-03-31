import { ensureSchema, getSql } from "../_lib/db.js";
import {
  createPasswordHash,
  createSession,
  findOrCreateGoogleUser,
  findUnverifiedUserByEmail,
  getTokenFromRequest,
  loginUser,
  logoutSession,
  registerUser,
  requireAuth,
  sanitizeUser,
  verifyEmailToken,
  verifyGoogleCredential,
  verifyPassword,
} from "../_lib/auth.js";
import { issueEmailVerificationToken, sendVerificationEmail } from "../_lib/email.js";
import { handleError, parseJsonBody, sendJson } from "../_lib/utils.js";

const handlers = {
  async register(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const body = await parseJsonBody(req);
    const user = await registerUser(body);
    const verificationToken = await issueEmailVerificationToken(user.id);
    await sendVerificationEmail(req, user, verificationToken);
    return sendJson(res, 201, {
      success: true,
      requiresVerification: true,
      email: user.email,
    });
  },

  async login(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const body = await parseJsonBody(req);
    const user = await loginUser(body);
    const token = await createSession(user.id);
    return sendJson(res, 200, { token, user: sanitizeUser(user) });
  },

  async google(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const body = await parseJsonBody(req);
    const payload = await verifyGoogleCredential(body.credential);
    const user = await findOrCreateGoogleUser(payload);
    const token = await createSession(user.id);
    return sendJson(res, 200, { token, user: sanitizeUser(user) });
  },

  async me(req, res) {
    if (req.method !== "GET") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const user = await requireAuth(req);
    return sendJson(res, 200, sanitizeUser(user));
  },

  async logout(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    await requireAuth(req);
    await logoutSession(getTokenFromRequest(req));
    return sendJson(res, 200, { success: true });
  },

  async profile(req, res) {
    const user = await requireAuth(req);

    if (req.method === "GET") {
      return sendJson(res, 200, sanitizeUser(user));
    }

    if (req.method !== "PATCH") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const body = await parseJsonBody(req);
    const nextFullName = body.fullName ?? body.full_name;
    const nextBirthDate = body.birthDate ?? body.birth_date;

    await ensureSchema();
    const sql = getSql();

    const rows = await sql`
      UPDATE users
      SET
        full_name = COALESCE(${nextFullName ? String(nextFullName).trim() : null}, full_name),
        birth_date = COALESCE(${nextBirthDate || null}, birth_date)
      WHERE id = ${user.id}
      RETURNING *
    `;

    return sendJson(res, 200, sanitizeUser(rows[0]));
  },

  async "change-password"(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const user = await requireAuth(req);
    const body = await parseJsonBody(req);
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (newPassword.length < 6) {
      const error = new Error("A nova senha deve ter pelo menos 6 caracteres.");
      error.status = 400;
      throw error;
    }

    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT id, password_hash, password_salt
      FROM users
      WHERE id = ${user.id}
      LIMIT 1
    `;

    const storedUser = rows[0];
    if (!storedUser || !verifyPassword(currentPassword, storedUser)) {
      const error = new Error("A senha atual está incorreta.");
      error.status = 400;
      throw error;
    }

    const { salt, passwordHash } = createPasswordHash(newPassword);

    await sql`
      UPDATE users
      SET
        password_hash = ${passwordHash},
        password_salt = ${salt}
      WHERE id = ${user.id}
    `;

    return sendJson(res, 200, { success: true });
  },

  async "cancel-subscription"(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const user = await requireAuth(req);

    if (user.role === "admin") {
      const error = new Error("Administradores não podem cancelar a assinatura por esta tela.");
      error.status = 400;
      throw error;
    }

    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      UPDATE users
      SET
        subscription_status = 'inactive',
        role = CASE WHEN role = 'premium' THEN 'user' ELSE role END
      WHERE id = ${user.id}
      RETURNING *
    `;

    return sendJson(res, 200, { success: true, user: sanitizeUser(rows[0]) });
  },

  async "resend-verification"(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const body = await parseJsonBody(req);
    const user = await findUnverifiedUserByEmail(body.email || "");

    if (!user) {
      return sendJson(res, 200, { success: true });
    }

    const token = await issueEmailVerificationToken(user.id);
    await sendVerificationEmail(req, user, token);
    return sendJson(res, 200, { success: true });
  },

  async "verify-email"(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const body = await parseJsonBody(req);
    const user = await verifyEmailToken(body.token || "");
    return sendJson(res, 200, { success: true, user: sanitizeUser(user) });
  },
};

export default async function handler(req, res) {
  try {
    const action = req.query.action;
    const actionHandler = handlers[action];

    if (!actionHandler) {
      return sendJson(res, 404, { message: "Not found" });
    }

    return await actionHandler(req, res);
  } catch (error) {
    return handleError(res, error);
  }
}
