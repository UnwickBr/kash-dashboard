import { getTokenFromRequest, logoutSession, requireAuth } from "../_lib/auth.js";
import { handleError, sendJson } from "../_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed" });
  }

  try {
    await requireAuth(req);
    await logoutSession(getTokenFromRequest(req));
    return sendJson(res, 200, { success: true });
  } catch (error) {
    return handleError(res, error);
  }
}
