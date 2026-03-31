import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { ensureSchema, getSql } from "./db.js";
import { nowIso } from "./utils.js";

let mailer = null;

const getMailer = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    const error = new Error("GMAIL_USER ou GMAIL_APP_PASSWORD não configurados.");
    error.status = 500;
    throw error;
  }

  if (!mailer) {
    mailer = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  return mailer;
};

const getFromEmail = () => process.env.GMAIL_FROM_EMAIL || `Kash Dashboard <${process.env.GMAIL_USER}>`;

const sendMail = async ({ to, replyTo, subject, html }) => {
  const transporter = getMailer();
  await transporter.sendMail({
    from: getFromEmail(),
    to,
    replyTo,
    subject,
    html,
  });
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
  const appUrl = getAppBaseUrl(req);
  const verificationUrl = `${appUrl}/#/verificar-email?token=${token}`;

  await sendMail({
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

export const sendReminderDigestEmail = async (user, remindersByStage) => {
  const appUrl = getAppBaseUrl();
  const remindersUrl = `${appUrl}/#/lembretes`;
  const sections = [
    { key: "upcoming", title: "Vencem amanhã" },
    { key: "dueToday", title: "Vencem hoje" },
    { key: "overdue", title: "Ficaram vencidos" },
  ]
    .map(({ key, title }) => {
      const items = remindersByStage[key] || [];
      if (!items.length) {
        return "";
      }

      return `
        <div style="margin:20px 0">
          <h3 style="margin:0 0 10px;color:#111827">${title}</h3>
          <ul style="padding-left:18px;margin:0;color:#374151">
            ${items
              .map(
                (reminder) => `
                  <li style="margin-bottom:8px">
                    <strong>${reminder.description}</strong>
                    ${reminder.amount ? ` · R$ ${Number(reminder.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
                    · ${reminder.due_date}
                    ${reminder.category ? ` · ${reminder.category}` : ""}
                  </li>
                `
              )
              .join("")}
          </ul>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  await sendMail({
    to: user.email,
    subject: "Seus lembretes do Kash Dashboard",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin-bottom:12px">Lembretes financeiros do dia</h2>
        <p>Olá, ${user.full_name || "usuário"}.</p>
        <p>Encontramos lembretes que merecem sua atenção:</p>
        ${sections}
        <p style="margin:24px 0">
          <a href="${remindersUrl}" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;display:inline-block;font-weight:700">
            Abrir meus lembretes
          </a>
        </p>
        <p>Se você já pagou alguma conta, marque como paga para manter tudo em dia.</p>
      </div>
    `,
  });
};

export const sendSupportEmail = async ({ name, email, subject, message }) => {
  const supportEmail = "kashdashboard@gmail.com";

  await sendMail({
    to: supportEmail,
    replyTo: email,
    subject: `[Contato Kash] ${subject}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin-bottom:12px">Nova mensagem de contato</h2>
        <p><strong>Nome:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Assunto:</strong> ${subject}</p>
        <div style="margin-top:20px;padding:16px;border:1px solid #e5e7eb;border-radius:12px;background:#f9fafb;white-space:pre-wrap">${message}</div>
      </div>
    `,
  });
};
