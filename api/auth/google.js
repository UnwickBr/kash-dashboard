import { createSession, findOrCreateGoogleUser, sanitizeUser, verifyGoogleCredential } from "../_lib/auth.js";
import { handleError, parseJsonBody, sendJson } from "../_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed" });
  }

  try {
    const body = await parseJsonBody(req);
    const payload = await verifyGoogleCredential(body.credential);
    const user = await findOrCreateGoogleUser(payload);
    const token = await createSession(user.id);
    return sendJson(res, 200, { token, user: sanitizeUser(user) });
  } catch (error) {
    return handleError(res, error);
  }
}
