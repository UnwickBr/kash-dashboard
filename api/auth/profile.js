import { ensureSchema, getSql } from "../_lib/db.js";
import { requireAuth, sanitizeUser } from "../_lib/auth.js";
import { handleError, parseJsonBody, sendJson } from "../_lib/utils.js";

export default async function handler(req, res) {
  try {
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
  } catch (error) {
    return handleError(res, error);
  }
}
