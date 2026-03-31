import { getSql, ensureSchema } from "./db.js";

const DEFAULT_ASAAS_BASE_URL = "https://api-sandbox.asaas.com/v3";
const DEFAULT_CHECKOUT_HOST = "https://asaas.com";

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
    checkoutHost: process.env.ASAAS_CHECKOUT_HOST || DEFAULT_CHECKOUT_HOST,
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
