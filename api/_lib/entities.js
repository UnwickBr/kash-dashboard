import { ENTITY_NAMES, ensureSchema, getSql } from "./db.js";
import { makeId, nowIso, normalizeRecord, sortItems, limitItems } from "./utils.js";

export const listUserRecords = async (userId, entityName, sortBy, limit) => {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT id, data, created_at, updated_at
    FROM entity_records
    WHERE user_id = ${userId}
      AND entity_name = ${entityName}
  `;

  return limitItems(sortItems(rows.map(normalizeRecord), sortBy), limit);
};

export const filterUserRecords = async (userId, entityName, query = {}, sortBy, limit) => {
  const records = await listUserRecords(userId, entityName, sortBy);
  const filtered = records.filter((record) =>
    Object.entries(query).every(([key, value]) => record[key] === value)
  );
  return limitItems(filtered, limit);
};

export const createUserRecord = async (user, entityName, payload) => {
  await ensureSchema();
  const sql = getSql();
  const id = makeId(entityName);
  const createdAt = nowIso();
  const data = {
    ...payload,
    created_by: user.email,
  };

  await sql`
    INSERT INTO entity_records (id, user_id, entity_name, data, created_at, updated_at)
    VALUES (
      ${id},
      ${user.id},
      ${entityName},
      ${JSON.stringify(data)}::jsonb,
      ${createdAt},
      ${createdAt}
    )
  `;

  return {
    ...data,
    id,
    created_date: createdAt,
    updated_date: createdAt,
  };
};

export const updateUserRecord = async (userId, entityName, id, payload) => {
  await ensureSchema();
  const sql = getSql();
  const rows = await sql`
    SELECT id, data, created_at, updated_at
    FROM entity_records
    WHERE user_id = ${userId}
      AND entity_name = ${entityName}
      AND id = ${id}
    LIMIT 1
  `;

  if (!rows.length) {
    const error = new Error(`${entityName} ${id} not found`);
    error.status = 404;
    throw error;
  }

  const record = normalizeRecord(rows[0]);
  const updatedAt = nowIso();
  const nextData = {
    ...record,
    ...payload,
  };
  delete nextData.id;
  delete nextData.created_date;
  delete nextData.updated_date;

  await sql`
    UPDATE entity_records
    SET data = ${JSON.stringify(nextData)}::jsonb,
        updated_at = ${updatedAt}
    WHERE user_id = ${userId}
      AND entity_name = ${entityName}
      AND id = ${id}
  `;

  return {
    ...nextData,
    id,
    created_date: record.created_date,
    updated_date: updatedAt,
  };
};

export const deleteUserRecord = async (userId, entityName, id) => {
  await ensureSchema();
  const sql = getSql();
  await sql`
    DELETE FROM entity_records
    WHERE user_id = ${userId}
      AND entity_name = ${entityName}
      AND id = ${id}
  `;
  return { success: true };
};

export const assertValidEntity = (entityName) => {
  if (entityName === "User") {
    return;
  }
  if (!ENTITY_NAMES.includes(entityName)) {
    const error = new Error("Entidade não encontrada.");
    error.status = 404;
    throw error;
  }
};
