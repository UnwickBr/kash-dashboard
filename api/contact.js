import { requireAuth } from "./_lib/auth.js";
import { logAuditEvent } from "./_lib/audit.js";
import { sendSupportEmail } from "./_lib/email.js";
import { handleError, parseJsonBody, sendJson } from "./_lib/utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const user = await requireAuth(req);
    const body = await parseJsonBody(req);
    const name = String(body.name || user.full_name || "").trim();
    const email = String(body.email || user.email || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();

    if (name.length < 2 || !email || subject.length < 3 || message.length < 5) {
      const error = new Error("Preencha nome, assunto e uma mensagem com pelo menos 5 caracteres.");
      error.status = 400;
      throw error;
    }

    await sendSupportEmail({ name, email, subject, message });
    await logAuditEvent({
      req,
      userId: user.id,
      eventType: "support.message_sent",
      entityName: "User",
      entityId: user.id,
      message: "Mensagem enviada pela página de contato.",
      metadata: { subject, fromEmail: email },
    });
    return sendJson(res, 200, { success: true });
  } catch (error) {
    return handleError(res, error);
  }
}
