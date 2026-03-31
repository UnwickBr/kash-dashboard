import { sanitizeUser, verifyEmailToken } from "../_lib/auth.js";
import { handleError, parseJsonBody, sendJson } from "../_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed" });
  }

  try {
    const body = await parseJsonBody(req);
    const user = await verifyEmailToken(body.token || "");
    return sendJson(res, 200, { success: true, user: sanitizeUser(user) });
  } catch (error) {
    return handleError(res, error);
  }
}
