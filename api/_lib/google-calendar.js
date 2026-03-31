import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { ensureSchema, getSql } from "./db.js";

const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const GOOGLE_CALENDAR_TIME_ZONE = "America/Sao_Paulo";

const getAppUrl = (req) => {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host || process.env.VERCEL_URL;
  const protocol = req?.headers?.["x-forwarded-proto"] || (host?.includes("localhost") ? "http" : "https");
  return host ? `${protocol}://${host}`.replace(/\/$/, "") : "";
};

const getRedirectUri = (req) => `${getAppUrl(req)}/api/google-calendar/callback`;

const getOAuthClient = (req) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const error = new Error("GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET precisam estar configurados.");
    error.status = 500;
    throw error;
  }

  return new OAuth2Client(clientId, clientSecret, getRedirectUri(req));
};

const fetchCalendar = async (accessToken, path, options = {}) => {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message || "Falha ao comunicar com o Google Calendar.");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

const getReminderEventPayload = (reminder) => {
  const dueDate = reminder.due_date;
  const [year, month, day] = dueDate.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 12, 30, 0));

  return {
    summary: reminder.description,
    description: [
      reminder.category ? `Categoria: ${reminder.category}` : null,
      reminder.amount ? `Valor: R$ ${Number(reminder.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null,
      reminder.recurrent ? "Recorrente: mensal" : null,
      "Criado pelo Kash Dashboard",
    ]
      .filter(Boolean)
      .join("\n"),
    start: {
      dateTime: start.toISOString(),
      timeZone: GOOGLE_CALENDAR_TIME_ZONE,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: GOOGLE_CALENDAR_TIME_ZONE,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 1440 },
        { method: "popup", minutes: 120 },
      ],
    },
  };
};

export const issueGoogleCalendarOAuthState = async (userId) => {
  await ensureSchema();
  const sql = getSql();
  const state = crypto.randomBytes(24).toString("hex");

  await sql`
    UPDATE users
    SET google_calendar_oauth_state = ${state}
    WHERE id = ${userId}
  `;

  return state;
};

export const buildGoogleCalendarConnectUrl = async (req, user) => {
  const client = getOAuthClient(req);
  const state = await issueGoogleCalendarOAuthState(user.id);

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_CALENDAR_SCOPE],
    include_granted_scopes: true,
    state,
  });
};

export const completeGoogleCalendarConnection = async (req, code, state) => {
  await ensureSchema();
  const sql = getSql();

  const users = await sql`
    SELECT id
    FROM users
    WHERE google_calendar_oauth_state = ${state}
    LIMIT 1
  `;

  const user = users[0];
  if (!user) {
    const error = new Error("Não foi possível validar a conexão com o Google Agenda.");
    error.status = 400;
    throw error;
  }

  const client = getOAuthClient(req);
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token && !tokens.access_token) {
    const error = new Error("O Google não retornou permissões válidas para a agenda.");
    error.status = 400;
    throw error;
  }

  await sql`
    UPDATE users
    SET
      google_calendar_refresh_token = COALESCE(${tokens.refresh_token || null}, google_calendar_refresh_token),
      google_calendar_connected_at = NOW(),
      google_calendar_sync_enabled = TRUE,
      google_calendar_oauth_state = NULL
    WHERE id = ${user.id}
  `;

  return user.id;
};

export const disconnectGoogleCalendar = async (userId) => {
  await ensureSchema();
  const sql = getSql();

  await sql`
    UPDATE users
    SET
      google_calendar_refresh_token = NULL,
      google_calendar_connected_at = NULL,
      google_calendar_sync_enabled = FALSE,
      google_calendar_oauth_state = NULL
    WHERE id = ${userId}
  `;
};

const getGoogleCalendarAccessToken = async (req, user) => {
  if (!user.google_calendar_refresh_token) {
    return null;
  }

  const client = getOAuthClient(req);
  client.setCredentials({ refresh_token: user.google_calendar_refresh_token });
  const tokenResponse = await client.getAccessToken();
  return tokenResponse?.token || null;
};

export const syncReminderToGoogleCalendar = async (req, user, reminder) => {
  if (!user.google_calendar_sync_enabled || !user.google_calendar_refresh_token || !reminder.due_date) {
    return reminder;
  }

  const accessToken = await getGoogleCalendarAccessToken(req, user);
  if (!accessToken) {
    return reminder;
  }

  const sql = getSql();
  const eventPayload = getReminderEventPayload(reminder);
  let eventId = reminder.google_calendar_event_id || null;

  if (eventId) {
    await fetchCalendar(accessToken, `/calendars/primary/events/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      body: JSON.stringify(eventPayload),
    });
  } else {
    const createdEvent = await fetchCalendar(accessToken, "/calendars/primary/events", {
      method: "POST",
      body: JSON.stringify(eventPayload),
    });
    eventId = createdEvent.id;
  }

  if (!eventId || reminder.google_calendar_event_id === eventId) {
    return reminder;
  }

  const nextReminder = {
    ...reminder,
    google_calendar_event_id: eventId,
  };
  const data = { ...nextReminder };
  delete data.id;
  delete data.created_date;
  delete data.updated_date;

  await sql`
    UPDATE entity_records
    SET
      data = ${JSON.stringify(data)}::jsonb,
      updated_at = NOW()
    WHERE id = ${reminder.id}
  `;

  return nextReminder;
};

export const deleteReminderFromGoogleCalendar = async (req, user, reminder) => {
  if (!user.google_calendar_sync_enabled || !user.google_calendar_refresh_token || !reminder.google_calendar_event_id) {
    return;
  }

  const accessToken = await getGoogleCalendarAccessToken(req, user);
  if (!accessToken) {
    return;
  }

  try {
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(reminder.google_calendar_event_id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    // Ignore remote deletion failures to avoid blocking local removal.
  }
};
