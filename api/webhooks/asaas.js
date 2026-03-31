import { activatePremiumByAsaasCustomer, assertAsaasWebhookToken } from "../_lib/asaas.js";
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

    return sendJson(res, 200, { success: true });
  } catch (error) {
    return handleError(res, error);
  }
}
