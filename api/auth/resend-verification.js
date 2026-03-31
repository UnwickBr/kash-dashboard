import { findUnverifiedUserByEmail } from "../_lib/auth.js";
import { issueEmailVerificationToken, sendVerificationEmail } from "../_lib/email.js";
import { handleError, parseJsonBody, sendJson } from "../_lib/utils.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed" });
  }

  try {
    const body = await parseJsonBody(req);
    const user = await findUnverifiedUserByEmail(body.email || "");

    if (!user) {
      return sendJson(res, 200, { success: true });
    }

    const token = await issueEmailVerificationToken(user.id);
    await sendVerificationEmail(req, user, token);

    return sendJson(res, 200, { success: true });
  } catch (error) {
    return handleError(res, error);
  }
}
