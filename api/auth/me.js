import { requireAuth, sanitizeUser } from "../_lib/auth.js";
import { handleError, sendJson } from "../_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { message: "Method not allowed" });
  }

  try {
    const user = await requireAuth(req);
    return sendJson(res, 200, sanitizeUser(user));
  } catch (error) {
    return handleError(res, error);
  }
}
