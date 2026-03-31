import { ensureSchema, getSql } from "../_lib/db.js";
import { hasPremiumAccess } from "../_lib/auth.js";
import { sendReminderDigestEmail } from "../_lib/email.js";
import { handleError, normalizeRecord, sendJson } from "../_lib/utils.js";

const TIME_ZONE = "America/Sao_Paulo";

const getDateKeyInTimeZone = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const valueByType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
};

const addDaysToDateKey = (dateKey, days) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day + days));
  const nextYear = utcDate.getUTCFullYear();
  const nextMonth = String(utcDate.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(utcDate.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
};

const getReminderStage = (reminder, todayKey, tomorrowKey) => {
  if (reminder.paid || !reminder.due_date) {
    return null;
  }

  if (reminder.due_date === tomorrowKey && !reminder.notification_email_upcoming_sent_at) {
    return "upcoming";
  }

  if (reminder.due_date === todayKey && !reminder.notification_email_due_today_sent_at) {
    return "dueToday";
  }

  if (reminder.due_date < todayKey && !reminder.notification_email_overdue_sent_at) {
    return "overdue";
  }

  return null;
};

const markReminderNotification = async (sql, recordId, reminder, stage) => {
  const fieldByStage = {
    upcoming: "notification_email_upcoming_sent_at",
    dueToday: "notification_email_due_today_sent_at",
    overdue: "notification_email_overdue_sent_at",
  };

  const field = fieldByStage[stage];
  if (!field) {
    return;
  }

  const nextData = {
    ...reminder,
    [field]: new Date().toISOString(),
  };

  delete nextData.id;
  delete nextData.created_date;
  delete nextData.updated_date;

  await sql`
    UPDATE entity_records
    SET
      data = ${JSON.stringify(nextData)}::jsonb,
      updated_at = NOW()
    WHERE id = ${recordId}
  `;
};

const assertCronAuth = (req) => {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return;
  }

  const authorization = req.headers.authorization || "";
  if (authorization !== `Bearer ${expected}`) {
    const error = new Error("Cron não autorizado.");
    error.status = 401;
    throw error;
  }
};

export default async function handler(req, res) {
  try {
    if (!["GET", "POST"].includes(req.method)) {
      return sendJson(res, 405, { message: "Method not allowed" });
    }

    assertCronAuth(req);
    await ensureSchema();
    const sql = getSql();
    const todayKey = getDateKeyInTimeZone();
    const tomorrowKey = addDaysToDateKey(todayKey, 1);

    const rows = await sql`
      SELECT
        er.id,
        er.data,
        er.created_at,
        er.updated_at,
        u.id AS user_id,
        u.full_name,
        u.email,
        u.email_verified,
        u.role,
        u.subscription_status,
        u.subscription_expires_at
      FROM entity_records er
      INNER JOIN users u ON u.id = er.user_id
      WHERE er.entity_name = 'PaymentReminder'
    `;

    const groupedByUser = new Map();

    rows.forEach((row) => {
      const reminder = normalizeRecord(row);
      const user = {
        id: row.user_id,
        full_name: row.full_name,
        email: row.email,
        email_verified: row.email_verified,
        role: row.role,
        subscription_status: row.subscription_status,
        subscription_expires_at: row.subscription_expires_at,
      };

      if (!user.email_verified || !hasPremiumAccess(user)) {
        return;
      }

      const stage = getReminderStage(reminder, todayKey, tomorrowKey);
      if (!stage) {
        return;
      }

      if (!groupedByUser.has(user.id)) {
        groupedByUser.set(user.id, {
          user,
          remindersByStage: {
            upcoming: [],
            dueToday: [],
            overdue: [],
          },
        });
      }

      groupedByUser.get(user.id).remindersByStage[stage].push({
        id: row.id,
        description: reminder.description,
        amount: reminder.amount,
        due_date: reminder.due_date,
        category: reminder.category,
        rawReminder: reminder,
      });
    });

    let sentEmails = 0;
    let touchedReminders = 0;

    for (const { user, remindersByStage } of groupedByUser.values()) {
      await sendReminderDigestEmail(user, remindersByStage);
      sentEmails += 1;

      for (const [stage, reminders] of Object.entries(remindersByStage)) {
        for (const reminder of reminders) {
          await markReminderNotification(sql, reminder.id, reminder.rawReminder, stage);
          touchedReminders += 1;
        }
      }
    }

    return sendJson(res, 200, {
      success: true,
      sentEmails,
      touchedReminders,
      today: todayKey,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
