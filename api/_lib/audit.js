import { ensureSchema, getSql } from "./db.js";
import { makeId, nowIso } from "./utils.js";

const getRequestDetails = (req) => ({
  method: req?.method || null,
  path: req?.url || null,
  ip:
    req?.headers?.["x-forwarded-for"] ||
    req?.headers?.["x-real-ip"] ||
    req?.socket?.remoteAddress ||
    null,
  userAgent: req?.headers?.["user-agent"] || null,
});

export const logAuditEvent = async ({
  req,
  userId = null,
  eventType,
  message,
  level = "info",
  entityName = null,
  entityId = null,
  metadata = {},
}) => {
  if (!eventType || !message) {
    return null;
  }

  await ensureSchema();
  const sql = getSql();
  const id = makeId("audit");

  await sql`
    INSERT INTO audit_logs (
      id,
      user_id,
      event_type,
      level,
      entity_name,
      entity_id,
      message,
      metadata,
      created_at
    )
    VALUES (
      ${id},
      ${userId},
      ${eventType},
      ${level},
      ${entityName},
      ${entityId},
      ${message},
      ${JSON.stringify({
        ...metadata,
        request: getRequestDetails(req),
      })}::jsonb,
      ${nowIso()}
    )
  `;

  return id;
};

export const listRecentAuditLogs = async (limit = 100) => {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT
      l.id,
      l.user_id,
      l.event_type,
      l.level,
      l.entity_name,
      l.entity_id,
      l.message,
      l.metadata,
      l.created_at,
      u.full_name,
      u.email
    FROM audit_logs l
    LEFT JOIN users u ON u.id = l.user_id
    ORDER BY l.created_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    event_type: row.event_type,
    level: row.level,
    entity_name: row.entity_name,
    entity_id: row.entity_id,
    message: row.message,
    metadata: row.metadata || {},
    created_at: row.created_at,
    user_name: row.full_name || null,
    user_email: row.email || null,
  }));
};
