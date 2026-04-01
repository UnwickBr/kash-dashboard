import { requireAuth, sanitizeUser } from "../_lib/auth.js";
import {
  buildGoogleCalendarConnectUrl,
  completeGoogleCalendarConnection,
  disconnectGoogleCalendar,
} from "../_lib/google-calendar.js";
import { logAuditEvent } from "../_lib/audit.js";
import { ensureSchema, getSql } from "../_lib/db.js";
import { handleError, sendJson } from "../_lib/utils.js";

const redirectToApp = (res, url) => {
  res.writeHead(302, { Location: url });
  res.end();
};

const getAppUrl = (req) => {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host || process.env.VERCEL_URL;
  const protocol = req.headers["x-forwarded-proto"] || (host?.includes("localhost") ? "http" : "https");
  return host ? `${protocol}://${host}`.replace(/\/$/, "") : "";
};

export default async function handler(req, res) {
  try {
    const { action } = req.query;

    if (action === "connect") {
      if (req.method !== "POST") {
        return sendJson(res, 405, { message: "Method not allowed" });
      }

      const user = await requireAuth(req);
      const url = await buildGoogleCalendarConnectUrl(req, user);
      await logAuditEvent({
        req,
        userId: user.id,
        eventType: "calendar.connect_started",
        entityName: "User",
        entityId: user.id,
        message: "Usuário iniciou a conexão com Google Agenda.",
      });
      return sendJson(res, 200, { url });
    }

    if (action === "callback") {
      if (req.method !== "GET") {
        return sendJson(res, 405, { message: "Method not allowed" });
      }

      const { code, state } = req.query;
      if (!code || !state) {
        return redirectToApp(res, `${getAppUrl(req)}/#/lembretes?calendar=error`);
      }

      const connectedUserId = await completeGoogleCalendarConnection(req, String(code), String(state));
      await logAuditEvent({
        req,
        userId: connectedUserId || null,
        eventType: "calendar.connected",
        entityName: "User",
        entityId: connectedUserId || null,
        message: "Google Agenda conectada com sucesso.",
      });
      return redirectToApp(res, `${getAppUrl(req)}/#/lembretes?calendar=connected`);
    }

    if (action === "disconnect") {
      if (req.method !== "POST") {
        return sendJson(res, 405, { message: "Method not allowed" });
      }

      const user = await requireAuth(req);
      await disconnectGoogleCalendar(user.id);
      await logAuditEvent({
        req,
        userId: user.id,
        eventType: "calendar.disconnected",
        entityName: "User",
        entityId: user.id,
        message: "Google Agenda desconectada pelo usuário.",
      });
      await ensureSchema();
      const sql = getSql();
      const rows = await sql`
        SELECT *
        FROM users
        WHERE id = ${user.id}
        LIMIT 1
      `;
      return sendJson(res, 200, { success: true, user: sanitizeUser(rows[0]) });
    }

    return sendJson(res, 404, { message: "Not found" });
  } catch (error) {
    if (req.query.action === "callback") {
      await logAuditEvent({
        req,
        eventType: "calendar.callback_failed",
        level: "error",
        message: error.message || "Falha ao concluir conexão com Google Agenda.",
        metadata: { action: req.query.action },
      }).catch(() => {});
      return redirectToApp(res, `${getAppUrl(req)}/#/lembretes?calendar=error`);
    }

    return handleError(res, error);
  }
}
