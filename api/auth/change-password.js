import { ensureSchema, getSql } from "../_lib/db.js";
import { createPasswordHash, requireAuth, verifyPassword } from "../_lib/auth.js";
import { handleError, parseJsonBody, sendJson } from "../_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed" });
  }

  try {
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
  } catch (error) {
    return handleError(res, error);
  }
}
