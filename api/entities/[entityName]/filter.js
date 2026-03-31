import { ensureSchema, getSql } from "../../_lib/db.js";
import { requireAuth, requireAdmin, sanitizeUser } from "../../_lib/auth.js";
import { assertValidEntity, filterUserRecords } from "../../_lib/entities.js";
import { handleError, parseJsonBody, sendJson } from "../../_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed" });
  }

  try {
    const user = await requireAuth(req);
    const { entityName } = req.query;
    const body = await parseJsonBody(req);
    const { query = {}, sortBy, limit } = body;

    if (entityName === "User") {
      requireAdmin(user);
      await ensureSchema();
      const sql = getSql();
      const rows = await sql`
        SELECT id, full_name, email, role, subscription_status, created_at
        FROM users
      `;
      const filtered = rows
        .map(sanitizeUser)
        .filter((record) => Object.entries(query).every(([key, value]) => record[key] === value));
      return sendJson(res, 200, filtered);
    }

    assertValidEntity(entityName);
    return sendJson(res, 200, await filterUserRecords(user.id, entityName, query, sortBy, limit));
  } catch (error) {
    return handleError(res, error);
  }
}
