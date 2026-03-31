import { ensureSchema, getSql } from "../_lib/db.js";
import { requireAuth, sanitizeUser } from "../_lib/auth.js";
import { handleError, sendJson } from "../_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed" });
  }

  try {
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
      RETURNING id, full_name, email, birth_date, role, subscription_status, created_at
    `;

    return sendJson(res, 200, { success: true, user: sanitizeUser(rows[0]) });
  } catch (error) {
    return handleError(res, error);
  }
}
