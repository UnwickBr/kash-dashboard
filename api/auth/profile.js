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
    const nextEmailRaw = body.email;
    const nextEmail = nextEmailRaw ? String(nextEmailRaw).trim().toLowerCase() : null;

    await ensureSchema();
    const sql = getSql();

    if (nextEmail && nextEmail !== user.email) {
      const existing = await sql`
        SELECT id
        FROM users
        WHERE email = ${nextEmail}
          AND id <> ${user.id}
        LIMIT 1
      `;

      if (existing.length) {
        const error = new Error("Já existe uma conta com esse email.");
        error.status = 409;
        throw error;
      }
    }

    const rows = await sql`
      UPDATE users
      SET
        full_name = COALESCE(${nextFullName ? String(nextFullName).trim() : null}, full_name),
        email = COALESCE(${nextEmail}, email),
        birth_date = COALESCE(${nextBirthDate || null}, birth_date)
      WHERE id = ${user.id}
      RETURNING id, full_name, email, birth_date, role, subscription_status, created_at
    `;

    return sendJson(res, 200, sanitizeUser(rows[0]));
  } catch (error) {
    return handleError(res, error);
  }
}
