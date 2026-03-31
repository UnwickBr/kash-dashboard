import { requireAuth, sanitizeUser } from "../_lib/auth.js";
import {
  buildGoogleCalendarConnectUrl,
  completeGoogleCalendarConnection,
  disconnectGoogleCalendar,
} from "../_lib/google-calendar.js";
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

      await completeGoogleCalendarConnection(req, String(code), String(state));
      return redirectToApp(res, `${getAppUrl(req)}/#/lembretes?calendar=connected`);
    }

    if (action === "disconnect") {
      if (req.method !== "POST") {
        return sendJson(res, 405, { message: "Method not allowed" });
      }

      const user = await requireAuth(req);
      await disconnectGoogleCalendar(user.id);
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
      return redirectToApp(res, `${getAppUrl(req)}/#/lembretes?calendar=error`);
    }

    return handleError(res, error);
  }
}
