import { ensureSchema, getSql } from "../_lib/db.js";
import {
  createPasswordHash,
  createSession,
  findOrCreateGoogleUser,
  findUnverifiedUserByEmail,
  getTokenFromRequest,
  hasPremiumAccess,
  loginUser,
  logoutSession,
  registerUser,
  requireAuth,
  sanitizeUser,
  verifyEmailToken,
  verifyGoogleCredential,
  verifyPassword,
} from "../_lib/auth.js";
import {
  activateTrialByAsaasCustomer,
  asaasRequest,
  buildCheckoutUrl,
  syncPremiumByAsaasCustomer,
  upsertAsaasCustomer,
} from "../_lib/asaas.js";
import { logAuditEvent } from "../_lib/audit.js";
import { issueEmailVerificationToken, sendVerificationEmail } from "../_lib/email.js";
import { handleError, parseJsonBody, sendJson } from "../_lib/utils.js";

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;
const FREE_TRIAL_DAYS = 7;
const toAsaasDateTime = (value) => value.toISOString().slice(0, 19).replace("T", " ");

const handlers = {
  async register(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const body = await parseJsonBody(req);
    const user = await registerUser(body);
    const verificationToken = await issueEmailVerificationToken(user.id);
    await sendVerificationEmail(req, user, verificationToken);
    await logAuditEvent({
      req,
      userId: user.id,
      eventType: "auth.registered",
      entityName: "User",
      entityId: user.id,
      message: "Novo usuário cadastrado e email de verificação enviado.",
      metadata: { authProvider: user.auth_provider, email: user.email },
    });
    return sendJson(res, 201, {
      success: true,
      requiresVerification: true,
      email: user.email,
    });
  },

  async login(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const body = await parseJsonBody(req);
    const user = await loginUser(body);
    const token = await createSession(user.id);
    await logAuditEvent({
      req,
      userId: user.id,
      eventType: "auth.login",
      entityName: "User",
      entityId: user.id,
      message: "Login por email realizado com sucesso.",
    });
    return sendJson(res, 200, { token, user: sanitizeUser(user) });
  },

  async google(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const body = await parseJsonBody(req);
    const payload = await verifyGoogleCredential(body.credential);
    const user = await findOrCreateGoogleUser(payload);
    const token = await createSession(user.id);
    await logAuditEvent({
      req,
      userId: user.id,
      eventType: "auth.google_login",
      entityName: "User",
      entityId: user.id,
      message: "Login com Google realizado com sucesso.",
      metadata: { email: user.email },
    });
    return sendJson(res, 200, { token, user: sanitizeUser(user) });
  },

  async me(req, res) {
    if (req.method !== "GET") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const user = await requireAuth(req);
    return sendJson(res, 200, sanitizeUser(user));
  },

  async logout(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const user = await requireAuth(req);
    const token = getTokenFromRequest(req);
    await logAuditEvent({
      req,
      userId: user.id,
      eventType: "auth.logout",
      entityName: "User",
      entityId: user.id,
      message: "Sessão encerrada pelo usuário.",
    });
    await logoutSession(token);
    return sendJson(res, 200, { success: true });
  },

  async profile(req, res) {
    const user = await requireAuth(req);

    if (req.method === "GET") {
      return sendJson(res, 200, sanitizeUser(user));
    }

    if (req.method !== "PATCH") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const body = await parseJsonBody(req);
    const nextFullName = body.fullName ?? body.full_name;
    const nextBirthDate = body.birthDate ?? body.birth_date;

    await ensureSchema();
    const sql = getSql();

    const rows = await sql`
      UPDATE users
      SET
        full_name = COALESCE(${nextFullName ? String(nextFullName).trim() : null}, full_name),
        birth_date = COALESCE(${nextBirthDate || null}, birth_date)
      WHERE id = ${user.id}
      RETURNING *
    `;

    await logAuditEvent({
      req,
      userId: user.id,
      eventType: "profile.updated",
      entityName: "User",
      entityId: user.id,
      message: "Perfil atualizado pelo usuário.",
      metadata: { changedBirthDate: Boolean(nextBirthDate), changedFullName: Boolean(nextFullName) },
    });

    return sendJson(res, 200, sanitizeUser(rows[0]));
  },

  async "change-password"(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const user = await requireAuth(req);
    const body = await parseJsonBody(req);
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");

    if (newPassword.length < 6) {
      const error = new Error("A nova senha deve ter pelo menos 6 caracteres.");
      error.status = 400;
      throw error;
    }

    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT id, password_hash, password_salt
      FROM users
      WHERE id = ${user.id}
      LIMIT 1
    `;

    const storedUser = rows[0];
    if (!storedUser || !verifyPassword(currentPassword, storedUser)) {
      const error = new Error("A senha atual está incorreta.");
      error.status = 400;
      throw error;
    }

    const { salt, passwordHash } = createPasswordHash(newPassword);

    await sql`
      UPDATE users
      SET
        password_hash = ${passwordHash},
        password_salt = ${salt}
      WHERE id = ${user.id}
    `;

    await logAuditEvent({
      req,
      userId: user.id,
      eventType: "auth.password_changed",
      entityName: "User",
      entityId: user.id,
      message: "Senha alterada com sucesso.",
    });

    return sendJson(res, 200, { success: true });
  },

  async "cancel-subscription"(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const user = await requireAuth(req);

    if (user.role === "admin") {
      const error = new Error("Administradores não podem cancelar a assinatura por esta tela.");
      error.status = 400;
      throw error;
    }

    if (!hasPremiumAccess(user) && !["active", "trialing"].includes(user.subscription_status)) {
      const error = new Error("Não há uma assinatura premium ativa para cancelar.");
      error.status = 400;
      throw error;
    }

    await ensureSchema();
    const sql = getSql();
    const cycleBase = user.subscription_started_at || user.created_at || new Date().toISOString();
    const cycleEndsAt =
      user.subscription_expires_at ||
      new Date(new Date(cycleBase).getTime() + THIRTY_DAYS_IN_MS).toISOString();

    const rows = await sql`
      UPDATE users
      SET
        subscription_status = 'active',
        subscription_started_at = COALESCE(subscription_started_at, ${cycleBase}),
        subscription_expires_at = COALESCE(subscription_expires_at, ${cycleEndsAt}),
        subscription_canceled_at = ${new Date().toISOString()}
      WHERE id = ${user.id}
      RETURNING *
    `;

    await logAuditEvent({
      req,
      userId: user.id,
      eventType: "subscription.cancellation_scheduled",
      entityName: "User",
      entityId: user.id,
      message: "Cancelamento de assinatura agendado para o fim do ciclo atual.",
      metadata: { subscriptionExpiresAt: rows[0]?.subscription_expires_at || cycleEndsAt },
    });

    return sendJson(res, 200, { success: true, user: sanitizeUser(rows[0]) });
  },

  async "create-premium-checkout"(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const user = await requireAuth(req);

    if (hasPremiumAccess(user)) {
      const error = new Error("Sua conta já possui acesso premium ativo.");
      error.status = 400;
      throw error;
    }

    const body = await parseJsonBody(req);
    const payer = {
      name: String(body.fullName || user.full_name || "").trim(),
      email: user.email,
      cpfCnpj: String(body.cpfCnpj || "").replace(/\D/g, ""),
      phone: String(body.phone || "").replace(/\D/g, ""),
      postalCode: String(body.postalCode || "").replace(/\D/g, ""),
      addressNumber: String(body.addressNumber || "").trim(),
      address: String(body.address || "").trim(),
      province: String(body.province || "").trim(),
      city: String(body.city || "").trim(),
      state: String(body.state || "").trim().toUpperCase(),
    };

    if (
      payer.name.length < 3 ||
      payer.cpfCnpj.length !== 11 ||
      payer.phone.length < 10 ||
      payer.postalCode.length !== 8 ||
      !payer.addressNumber ||
      !payer.address ||
      !payer.province ||
      !payer.city ||
      payer.state.length !== 2
    ) {
      const error = new Error("Preencha os dados do pagador corretamente antes de continuar.");
      error.status = 400;
      throw error;
    }

    await ensureSchema();
    const sql = getSql();
    const customerId = await upsertAsaasCustomer(user, payer);
    const inferredAppUrl = req.headers.origin || `https://${req.headers.host}`;
    const appUrl = (process.env.APP_URL || inferredAppUrl || "").replace(/\/$/, "");
    const now = new Date();
    const nextDueDate = new Date(now.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
    const checkout = await asaasRequest("/checkouts", {
      method: "POST",
      body: {
        billingTypes: ["CREDIT_CARD"],
        chargeTypes: ["RECURRENT"],
        minutesToExpire: 60,
        callback: {
          successUrl: `${appUrl}/#/premium?checkout=success`,
          cancelUrl: `${appUrl}/#/premium?checkout=cancel`,
          expiredUrl: `${appUrl}/#/premium?checkout=expired`,
        },
        items: [
          {
            name: "Kash Premium",
            description: "Teste grátis de 7 dias e depois assinatura mensal do Kash Premium",
            quantity: 1,
            value: 20,
          },
        ],
        customer: customerId,
        subscription: {
          cycle: "MONTHLY",
          nextDueDate: toAsaasDateTime(nextDueDate),
          endDate: toAsaasDateTime(endDate),
        },
      },
    });

    const checkoutUrl =
      checkout.url ||
      checkout.checkoutUrl ||
      checkout.redirectUrl ||
      (checkout.id ? buildCheckoutUrl(checkout.id) : null);

    if (!checkoutUrl) {
      const error = new Error("O Asaas não retornou uma URL válida para o checkout.");
      error.status = 502;
      throw error;
    }

    await sql`
      UPDATE users
      SET asaas_checkout_id = ${checkout.id}
      WHERE id = ${user.id}
    `;

    await logAuditEvent({
      req,
      userId: user.id,
      eventType: "subscription.checkout_created",
      entityName: "User",
      entityId: user.id,
      message: "Checkout premium criado no Asaas.",
      metadata: { checkoutId: checkout.id, customerId },
    });

    return sendJson(res, 200, {
      success: true,
      checkoutId: checkout.id,
      checkoutUrl,
    });
  },

  async "sync-premium-status"(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const user = await requireAuth(req);
    const syncedUser = await syncPremiumByAsaasCustomer(user.asaas_customer_id);

    await logAuditEvent({
      req,
      userId: user.id,
      eventType: syncedUser ? "subscription.sync_activated" : "subscription.sync_checked",
      entityName: "User",
      entityId: user.id,
      message: syncedUser
        ? "Status premium sincronizado e acesso ativado."
        : "Status premium verificado sem nova ativação.",
      metadata: { asaasCustomerId: user.asaas_customer_id || null },
    });

    return sendJson(res, 200, {
      success: true,
      user: syncedUser ? sanitizeUser(syncedUser) : sanitizeUser(user),
      activated: Boolean(syncedUser),
    });
  },

  async "activate-premium-trial"(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const user = await requireAuth(req);
    const trialUser = await activateTrialByAsaasCustomer(user.asaas_customer_id);

    await logAuditEvent({
      req,
      userId: user.id,
      eventType: trialUser ? "subscription.trial_activated" : "subscription.trial_checked",
      entityName: "User",
      entityId: user.id,
      message: trialUser
        ? "Período de teste grátis ativado com sucesso."
        : "Tentativa de ativação de teste sem mudança de status.",
      metadata: { asaasCustomerId: user.asaas_customer_id || null },
    });

    return sendJson(res, 200, {
      success: true,
      user: trialUser ? sanitizeUser(trialUser) : sanitizeUser(user),
      activated: Boolean(trialUser),
    });
  },

  async "resend-verification"(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const body = await parseJsonBody(req);
    const user = await findUnverifiedUserByEmail(body.email || "");

    if (!user) {
      return sendJson(res, 200, { success: true });
    }

    const token = await issueEmailVerificationToken(user.id);
    await sendVerificationEmail(req, user, token);
    await logAuditEvent({
      req,
      userId: user.id,
      eventType: "auth.verification_resent",
      entityName: "User",
      entityId: user.id,
      message: "Email de verificação reenviado.",
    });
    return sendJson(res, 200, { success: true });
  },

  async "verify-email"(req, res) {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    const body = await parseJsonBody(req);
    const user = await verifyEmailToken(body.token || "");
    await logAuditEvent({
      req,
      userId: user.id,
      eventType: "auth.email_verified",
      entityName: "User",
      entityId: user.id,
      message: "Conta verificada por email.",
    });
    return sendJson(res, 200, { success: true, user: sanitizeUser(user) });
  },
};

export default async function handler(req, res) {
  try {
    const action = req.query.action;
    const actionHandler = handlers[action];

    if (!actionHandler) {
      return sendJson(res, 404, { message: "Not found" });
    }

    return await actionHandler(req, res);
  } catch (error) {
    return handleError(res, error);
  }
}
