import { ENTITY_NAMES, ensureSchema, getSql } from "./db.js";
import { makeId, nowIso, normalizeRecord, sortItems, limitItems } from "./utils.js";

export const seedUserData = async (user) => {
  const sql = getSql();
  const existing = await sql`
    SELECT id
    FROM entity_records
    WHERE user_id = ${user.id}
    LIMIT 1
  `;

  if (existing.length) {
    return;
  }

  const today = new Date();
  const isoDate = (date) => date.toISOString().split("T")[0];
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const createdAt = nowIso();

  const records = [
    {
      entityName: "Transaction",
      id: makeId("transaction"),
      data: {
        description: "Salário",
        amount: 6500,
        type: "receita",
        category: "Salário",
        date: isoDate(new Date(today.getFullYear(), today.getMonth(), 5)),
        notes: "Entrada inicial",
        created_by: user.email,
      },
    },
    {
      entityName: "Transaction",
      id: makeId("transaction"),
      data: {
        description: "Supermercado",
        amount: 320.5,
        type: "despesa",
        category: "Alimentação",
        date: isoDate(new Date(today.getFullYear(), today.getMonth(), 8)),
        notes: "",
        created_by: user.email,
      },
    },
    {
      entityName: "Budget",
      id: makeId("budget"),
      data: {
        category: "Alimentação",
        limit_amount: 1200,
        month: currentMonth,
        created_by: user.email,
      },
    },
    {
      entityName: "Savings",
      id: makeId("savings"),
      data: {
        name: "Reserva de emergência",
        amount: 1500,
        goal_amount: 10000,
        monthly_deposit: 500,
        description: "Meta inicial",
        icon: "🐷",
        created_by: user.email,
      },
    },
    {
      entityName: "PaymentReminder",
      id: makeId("paymentreminder"),
      data: {
        description: "Conta de luz",
        amount: 180,
        due_date: isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3)),
        recurrent: true,
        paid: false,
        category: "Água/Luz/Gás",
        created_by: user.email,
      },
    },
    {
      entityName: "ShoppingItem",
      id: makeId("shoppingitem"),
      data: {
        name: "Arroz",
        price: 32.9,
        quantity: 1,
        unit: "pacote",
        checked: false,
        created_by: user.email,
      },
    },
  ];

  await Promise.all(
    records.map((record) =>
      sql`
        INSERT INTO entity_records (id, user_id, entity_name, data, created_at, updated_at)
        VALUES (
          ${record.id},
          ${user.id},
          ${record.entityName},
          ${JSON.stringify(record.data)}::jsonb,
          ${createdAt},
          ${createdAt}
        )
      `
    )
  );
};

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
