import { listRecentAuditLogs } from "../_lib/audit.js";
import { requireAuth, requireAdmin } from "../_lib/auth.js";
import { handleError, sendJson } from "../_lib/utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const user = await requireAuth(req);
    requireAdmin(user);

    const limit = Number(req.query.limit || 50);
    const logs = await listRecentAuditLogs(Number.isFinite(limit) ? Math.min(limit, 200) : 50);
    return sendJson(res, 200, logs);
  } catch (error) {
    return handleError(res, error);
  }
}
