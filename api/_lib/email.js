import crypto from "node:crypto";
import { Resend } from "resend";
import { ensureSchema, getSql } from "./db.js";
import { nowIso } from "./utils.js";

let resendClient = null;

const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    const error = new Error("RESEND_API_KEY não configurada.");
    error.status = 500;
    throw error;
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
};

const getAppBaseUrl = (req) => {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host || process.env.VERCEL_URL;
  if (!host) {
    const error = new Error("Não foi possível determinar a URL pública da aplicação.");
    error.status = 500;
    throw error;
  }

  const protocol = req?.headers?.["x-forwarded-proto"] || (host.includes("localhost") ? "http" : "https");
  return `${protocol}://${host}`.replace(/\/$/, "");
};

export const issueEmailVerificationToken = async (userId) => {
  await ensureSchema();
  const sql = getSql();
  const token = crypto.randomBytes(32).toString("hex");
  const sentAt = nowIso();

  await sql`
    UPDATE users
    SET
      email_verification_token = ${token},
      email_verification_sent_at = ${sentAt}
    WHERE id = ${userId}
  `;

  return token;
};

export const sendVerificationEmail = async (req, user, token) => {
  const resend = getResend();
  const appUrl = getAppBaseUrl(req);
  const verificationUrl = `${appUrl}/#/verificar-email?token=${token}`;
  const from = process.env.RESEND_FROM_EMAIL || "Kash Dashboard <onboarding@resend.dev>";

  await resend.emails.send({
    from,
    to: user.email,
    subject: "Confirme seu email para ativar sua conta",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin-bottom:12px">Confirme seu cadastro no Kash Dashboard</h2>
        <p>Olá, ${user.full_name || "usuário"}.</p>
        <p>Para ativar sua conta, clique no botão abaixo:</p>
        <p style="margin:24px 0">
          <a href="${verificationUrl}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block;font-weight:700">
            Confirmar email
          </a>
        </p>
        <p>Se preferir, copie e cole este link no navegador:</p>
        <p style="word-break:break-all;color:#2563eb">${verificationUrl}</p>
        <p>Se você não criou essa conta, pode ignorar este email.</p>
      </div>
    `,
  });
};
