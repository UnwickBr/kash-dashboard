import { ensureSchema, getSql } from "../../_lib/db.js";
import { getTokenFromRequest, logoutSession, requireAuth, requireAdmin, sanitizeUser } from "../../_lib/auth.js";
import { logAuditEvent } from "../../_lib/audit.js";
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
        const nextSubscriptionStatus = body.subscription_status ?? null;
        const activatingPremium = nextSubscriptionStatus === "active";
        const deactivatingPremium = nextSubscriptionStatus === "inactive";
        const rows = await sql`
          UPDATE users
          SET
            full_name = COALESCE(${body.full_name}, full_name),
            role = COALESCE(${body.role}, role),
            subscription_status = COALESCE(${body.subscription_status}, subscription_status),
            subscription_started_at = CASE
              WHEN ${activatingPremium} THEN COALESCE(subscription_started_at, NOW())
              WHEN ${deactivatingPremium} THEN NULL
              ELSE subscription_started_at
            END,
            subscription_expires_at = CASE
              WHEN ${activatingPremium} THEN COALESCE(subscription_expires_at, NOW() + INTERVAL '30 days')
              WHEN ${deactivatingPremium} THEN NULL
              ELSE subscription_expires_at
            END,
            subscription_canceled_at = CASE
              WHEN ${activatingPremium} THEN NULL
              WHEN ${deactivatingPremium} THEN NOW()
              ELSE subscription_canceled_at
            END
          WHERE id = ${id}
          RETURNING *
        `;
        if (!rows.length) {
          return sendJson(res, 404, { message: "Usuário não encontrado." });
        }

        await logAuditEvent({
          req,
          userId: user.id,
          eventType: "admin.user_updated",
          entityName: "User",
          entityId: id,
          message: "Administrador atualizou um usuário.",
          metadata: {
            changedRole: body.role ?? null,
            changedSubscriptionStatus: body.subscription_status ?? null,
          },
        });

        return sendJson(res, 200, sanitizeUser(rows[0]));
      }

      if (req.method === "DELETE") {
        await sql`DELETE FROM users WHERE id = ${id}`;
        await logAuditEvent({
          req,
          userId: user.id,
          eventType: "admin.user_deleted",
          entityName: "User",
          entityId: id,
          level: "warning",
          message: "Administrador removeu um usuário.",
        });
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
      return sendJson(res, 200, await updateUserRecord(req, user, entityName, id, body));
    }

    if (req.method === "DELETE") {
      return sendJson(res, 200, await deleteUserRecord(req, user, entityName, id));
    }

    return sendJson(res, 405, { message: "Method not allowed" });
  } catch (error) {
    return handleError(res, error);
  }
}
