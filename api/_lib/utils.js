export const clone = (value) => JSON.parse(JSON.stringify(value));
export const nowIso = () => new Date().toISOString();
export const makeId = (prefix) => `${prefix.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const compareValues = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
};

export const sortItems = (items, sortBy) => {
  if (!sortBy) return items;
  const descending = sortBy.startsWith("-");
  const field = descending ? sortBy.slice(1) : sortBy;
  const sorted = [...items].sort((left, right) => compareValues(left[field], right[field]));
  return descending ? sorted.reverse() : sorted;
};

export const limitItems = (items, limit) => {
  if (limit == null) return items;
  const parsed = Number(limit);
  return Number.isFinite(parsed) ? items.slice(0, parsed) : items;
};

export const parseJsonBody = async (req) => {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

export const sendJson = (res, status, payload) => {
  res.status(status).json(payload);
};

export const handleError = (res, error) => {
  console.error(error);
  sendJson(res, error.status || 500, {
    message: error.message || "Erro interno do servidor.",
    ...(error.payload || {}),
  });
};

export const normalizeRecord = (row) => {
  const data = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
  return {
    ...data,
    id: row.id,
    created_date: row.created_at,
    updated_date: row.updated_at,
  };
};
