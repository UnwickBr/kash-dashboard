import { ensureSchema, getSql } from "../_lib/db.js";
import { requireAuth, requireAdmin, sanitizeUser } from "../_lib/auth.js";
import { assertValidEntity, createUserRecord, listUserRecords } from "../_lib/entities.js";
import { handleError, parseJsonBody, sendJson } from "../_lib/utils.js";

export default async function handler(req, res) {
  try {
    const user = await requireAuth(req);
    const { entityName, sortBy, limit } = req.query;

    if (req.method === "GET") {
      if (entityName === "User") {
        requireAdmin(user);
        await ensureSchema();
        const sql = getSql();
        const rows = await sql`
          SELECT id, full_name, email, role, subscription_status, created_at
          FROM users
        `;
        return sendJson(res, 200, rows.map(sanitizeUser));
      }

      assertValidEntity(entityName);
      return sendJson(res, 200, await listUserRecords(user, entityName, sortBy, limit));
    }

    if (req.method === "POST") {
      assertValidEntity(entityName);
      const body = await parseJsonBody(req);
      return sendJson(res, 201, await createUserRecord(req, user, entityName, body));
    }

    return sendJson(res, 405, { message: "Method not allowed" });
  } catch (error) {
    return handleError(res, error);
  }
}
