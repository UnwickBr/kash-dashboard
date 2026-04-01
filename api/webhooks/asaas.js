import { activatePremiumByAsaasCustomer, assertAsaasWebhookToken } from "../_lib/asaas.js";
import { logAuditEvent } from "../_lib/audit.js";
import { handleError, parseJsonBody, sendJson } from "../_lib/utils.js";

const PREMIUM_PAYMENT_EVENTS = new Set([
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
]);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    assertAsaasWebhookToken(req);

    const payload = await parseJsonBody(req);
    const payment = payload?.payment;
    const event = payload?.event;

    if (!payment || !event) {
      return sendJson(res, 200, { success: true, ignored: true });
    }

    if (PREMIUM_PAYMENT_EVENTS.has(event)) {
      await activatePremiumByAsaasCustomer({
        customerId: payment.customer,
        subscriptionId: payment.subscription,
        paidAt: payment.paymentDate || payment.clientPaymentDate || payment.confirmedDate || new Date().toISOString(),
      });
    }

    await logAuditEvent({
      req,
      eventType: PREMIUM_PAYMENT_EVENTS.has(event) ? "asaas.payment_processed" : "asaas.webhook_ignored",
      entityName: "User",
      entityId: payment.customer || null,
      message: PREMIUM_PAYMENT_EVENTS.has(event)
        ? `Webhook do Asaas processado com sucesso: ${event}.`
        : `Evento do Asaas recebido e ignorado: ${event}.`,
      metadata: {
        event,
        customerId: payment.customer || null,
        subscriptionId: payment.subscription || null,
        paymentId: payment.id || null,
      },
    });

    return sendJson(res, 200, { success: true });
  } catch (error) {
    return handleError(res, error);
  }
}
