import { getSql, ensureSchema } from "./db.js";

const DEFAULT_ASAAS_BASE_URL = "https://api-sandbox.asaas.com/v3";

const inferCheckoutHost = (baseUrl) => {
  if (baseUrl.includes("api-sandbox.asaas.com")) {
    return "https://sandbox.asaas.com";
  }

  return "https://asaas.com";
};

const getAsaasConfig = () => {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) {
    const error = new Error("ASAAS_API_KEY nao configurada.");
    error.status = 500;
    throw error;
  }

  return {
    apiKey,
    baseUrl: process.env.ASAAS_API_BASE_URL || DEFAULT_ASAAS_BASE_URL,
    checkoutHost: process.env.ASAAS_CHECKOUT_HOST || inferCheckoutHost(process.env.ASAAS_API_BASE_URL || DEFAULT_ASAAS_BASE_URL),
  };
};

export const asaasRequest = async (path, { method = "GET", body } = {}) => {
  const { apiKey, baseUrl } = getAsaasConfig();

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      access_token: apiKey,
      "Content-Type": "application/json",
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const firstError = payload?.errors?.[0];
    const error = new Error(firstError?.description || payload?.message || "Falha ao comunicar com o Asaas.");
    error.status = response.status;
    error.payload = { asaas: payload };
    throw error;
  }

  return payload;
};

export const buildCheckoutUrl = (checkoutId) => {
  const { checkoutHost } = getAsaasConfig();
  return `${checkoutHost}/checkoutSession/show?id=${checkoutId}`;
};

export const assertAsaasWebhookToken = (req) => {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expectedToken) {
    const error = new Error("ASAAS_WEBHOOK_TOKEN nao configurado.");
    error.status = 500;
    throw error;
  }

  const receivedToken =
    req.headers["asaas-access-token"] ||
    req.headers["Asaas-Access-Token"] ||
    req.headers["asaas_access_token"];

  if (receivedToken !== expectedToken) {
    const error = new Error("Webhook do Asaas rejeitado por token invalido.");
    error.status = 401;
    throw error;
  }
};

export const ensureAsaasCustomer = async (user) => {
  await ensureSchema();
  const sql = getSql();

  if (user.asaas_customer_id) {
    return user.asaas_customer_id;
  }

  const createdCustomer = await asaasRequest("/customers", {
    method: "POST",
    body: {
      name: user.full_name,
      email: user.email,
    },
  });

  await sql`
    UPDATE users
    SET asaas_customer_id = ${createdCustomer.id}
    WHERE id = ${user.id}
  `;

  return createdCustomer.id;
};

export const activatePremiumByAsaasCustomer = async ({ customerId, subscriptionId, paidAt }) => {
  if (!customerId) {
    return null;
  }

  await ensureSchema();
  const sql = getSql();
  const startedAt = paidAt || new Date().toISOString();
  const expiresAt = new Date(new Date(startedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const rows = await sql`
    UPDATE users
    SET
      subscription_status = 'active',
      role = CASE WHEN role = 'user' THEN 'premium' ELSE role END,
      subscription_started_at = ${startedAt},
      subscription_expires_at = ${expiresAt},
      subscription_canceled_at = NULL,
      asaas_subscription_id = COALESCE(${subscriptionId || null}, asaas_subscription_id)
    WHERE asaas_customer_id = ${customerId}
    RETURNING *
  `;

  return rows[0] || null;
};
