import { ensureSchema, getSql } from "../../_lib/db.js";
import { getTokenFromRequest, logoutSession, requireAuth, requireAdmin, sanitizeUser } from "../../_lib/auth.js";
import { assertValidEntity, deleteUserRecord, updateUserRecord } from "../../_lib/entities.js";
import { handleError, parseJsonBody, sendJson } from "../../_lib/utils.js";

export default async function handler(req, res) {
  try {
    const user = await requireAuth(req);
    const { entityName, id } = req.query;

    if (entityName === "User") {
      requireAdmin(user);
      await ensureSchema();
      const sql = getSql();

      if (req.method === "PATCH") {
        const body = await parseJsonBody(req);
        const rows = await sql`
          UPDATE users
          SET
            full_name = COALESCE(${body.full_name}, full_name),
            role = COALESCE(${body.role}, role),
            subscription_status = COALESCE(${body.subscription_status}, subscription_status)
          WHERE id = ${id}
          RETURNING id, full_name, email, role, subscription_status, created_at
        `;
        if (!rows.length) {
          return sendJson(res, 404, { message: "Usuário não encontrado." });
        }
        return sendJson(res, 200, sanitizeUser(rows[0]));
      }

      if (req.method === "DELETE") {
        await sql`DELETE FROM users WHERE id = ${id}`;
        if (id === user.id) {
          await logoutSession(getTokenFromRequest(req));
        }
        return sendJson(res, 200, { success: true });
      }

      return sendJson(res, 405, { message: "Method not allowed" });
    }

    assertValidEntity(entityName);

    if (req.method === "PATCH") {
      const body = await parseJsonBody(req);
      return sendJson(res, 200, await updateUserRecord(user.id, entityName, id, body));
    }

    if (req.method === "DELETE") {
      return sendJson(res, 200, await deleteUserRecord(user.id, entityName, id));
    }

    return sendJson(res, 405, { message: "Method not allowed" });
  } catch (error) {
    return handleError(res, error);
  }
}
