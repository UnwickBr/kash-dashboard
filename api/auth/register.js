import { createSession, registerUser, sanitizeUser } from "../_lib/auth.js";
import { seedUserData } from "../_lib/entities.js";
import { handleError, parseJsonBody, sendJson } from "../_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed" });
  }

  try {
    const body = await parseJsonBody(req);
    const user = await registerUser(body);
    await seedUserData(user);
    const token = await createSession(user.id);
    return sendJson(res, 201, { token, user: sanitizeUser(user) });
  } catch (error) {
    return handleError(res, error);
  }
}
