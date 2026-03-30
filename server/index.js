import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";

const app = express();
const PORT = Number(process.env.PORT || 3001);
const ROOT_DIR = process.cwd();
const DB_DIR = path.join(ROOT_DIR, "local-db");
const USERS_DIR = path.join(DB_DIR, "users");
const ACCOUNTS_FILE = path.join(DB_DIR, "accounts.json");
const SESSIONS_FILE = path.join(DB_DIR, "sessions.json");
const ENTITY_NAMES = ["Transaction", "Budget", "Savings", "PaymentReminder", "ShoppingItem", "PaidList"];

app.use(express.json());

const clone = (value) => JSON.parse(JSON.stringify(value));

const nowIso = () => new Date().toISOString();

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const readJson = async (filePath, fallback) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
};

const writeJson = async (filePath, data) => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
};

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "user";

const makeId = (prefix) => `${prefix.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const createPasswordHash = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
};

const verifyPassword = (password, passwordHash) => {
  const hashBuffer = Buffer.from(passwordHash.hash, "hex");
  const suppliedHash = crypto.scryptSync(password, passwordHash.salt, 64);
  return crypto.timingSafeEqual(hashBuffer, suppliedHash);
};

const createEmptyUserData = (user) => ({
  profile: {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    subscription_status: user.subscription_status,
    created_date: user.created_date,
  },
  entities: Object.fromEntries(ENTITY_NAMES.map((name) => [name, []])),
});

const createSeedUserData = (user) => {
  const today = new Date();
  const isoDate = (date) => date.toISOString().split("T")[0];
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  return {
    profile: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      subscription_status: user.subscription_status,
      created_date: user.created_date,
    },
    entities: {
      Transaction: [
        {
          id: makeId("transaction"),
          description: "Salário",
          amount: 6500,
          type: "receita",
          category: "Salário",
          date: isoDate(new Date(today.getFullYear(), today.getMonth(), 5)),
          notes: "Entrada mensal",
          created_by: user.email,
          created_date: nowIso(),
          updated_date: nowIso(),
        },
        {
          id: makeId("transaction"),
          description: "Supermercado",
          amount: 420.75,
          type: "despesa",
          category: "Alimentação",
          date: isoDate(new Date(today.getFullYear(), today.getMonth(), 8)),
          notes: "",
          created_by: user.email,
          created_date: nowIso(),
          updated_date: nowIso(),
        },
      ],
      Budget: [
        {
          id: makeId("budget"),
          category: "Alimentação",
          limit_amount: 1200,
          month: currentMonth,
          created_by: user.email,
          created_date: nowIso(),
          updated_date: nowIso(),
        },
      ],
      Savings: [
        {
          id: makeId("savings"),
          name: "Reserva de emergência",
          amount: 1500,
          goal_amount: 10000,
          monthly_deposit: 500,
          description: "Primeira meta cadastrada",
          icon: "🐷",
          created_by: user.email,
          created_date: nowIso(),
          updated_date: nowIso(),
        },
      ],
      PaymentReminder: [
        {
          id: makeId("paymentreminder"),
          description: "Conta de luz",
          amount: 180,
          due_date: isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3)),
          recurrent: true,
          paid: false,
          category: "Água/Luz/Gás",
          created_by: user.email,
          created_date: nowIso(),
          updated_date: nowIso(),
        },
      ],
      ShoppingItem: [
        {
          id: makeId("shoppingitem"),
          name: "Arroz",
          price: 32.9,
          quantity: 1,
          unit: "pacote",
          checked: false,
          created_by: user.email,
          created_date: nowIso(),
          updated_date: nowIso(),
        },
      ],
      PaidList: [],
    },
  };
};

const getUserFilePath = (userId, email) => path.join(USERS_DIR, `${userId}-${slugify(email)}.json`);

const compareValues = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
};

const sortItems = (items, sortBy) => {
  if (!sortBy) return items;
  const descending = sortBy.startsWith("-");
  const field = descending ? sortBy.slice(1) : sortBy;
  const sorted = [...items].sort((left, right) => compareValues(left[field], right[field]));
  return descending ? sorted.reverse() : sorted;
};

const limitItems = (items, limit) => {
  if (limit == null) return items;
  const parsed = Number(limit);
  return Number.isFinite(parsed) ? items.slice(0, parsed) : items;
};

const bootstrapStorage = async () => {
  await ensureDir(USERS_DIR);
  const accounts = await readJson(ACCOUNTS_FILE, []);
  const sessions = await readJson(SESSIONS_FILE, []);
  if (!accounts.length) {
    await writeJson(ACCOUNTS_FILE, []);
  }
  if (!sessions.length) {
    await writeJson(SESSIONS_FILE, []);
  }
};

const getAccounts = async () => readJson(ACCOUNTS_FILE, []);
const saveAccounts = async (accounts) => writeJson(ACCOUNTS_FILE, accounts);
const getSessions = async () => readJson(SESSIONS_FILE, []);
const saveSessions = async (sessions) => writeJson(SESSIONS_FILE, sessions);

const readUserData = async (user) => {
  const filePath = getUserFilePath(user.id, user.email);
  const fallback = createEmptyUserData(user);
  const data = await readJson(filePath, fallback);
  if (!data.profile) {
    data.profile = fallback.profile;
  }
  if (!data.entities) {
    data.entities = fallback.entities;
  }
  for (const entityName of ENTITY_NAMES) {
    if (!Array.isArray(data.entities[entityName])) {
      data.entities[entityName] = [];
    }
  }
  return data;
};

const saveUserData = async (user, data) => {
  const filePath = getUserFilePath(user.id, user.email);
  const payload = clone(data);
  payload.profile = {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    subscription_status: user.subscription_status,
    created_date: user.created_date,
  };
  await writeJson(filePath, payload);
};

const createSessionForUser = async (userId) => {
  const sessions = await getSessions();
  const token = crypto.randomBytes(24).toString("hex");
  sessions.push({
    token,
    userId,
    createdAt: nowIso(),
  });
  await saveSessions(sessions);
  return token;
};

const getUserFromRequest = async (req) => {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) {
    return null;
  }

  const [sessions, accounts] = await Promise.all([getSessions(), getAccounts()]);
  const session = sessions.find((entry) => entry.token === token);
  if (!session) {
    return null;
  }

  return accounts.find((account) => account.id === session.userId) || null;
};

const requireAuth = async (req, res, next) => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ message: "Sessão inválida ou expirada." });
    return;
  }
  req.user = user;
  next();
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const { fullName, email, password } = req.body || {};

  if (!fullName || !email || !password) {
    res.status(400).json({ message: "Nome, email e senha são obrigatórios." });
    return;
  }

  if (String(password).length < 6) {
    res.status(400).json({ message: "A senha precisa ter pelo menos 6 caracteres." });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const accounts = await getAccounts();
  if (accounts.some((account) => account.email === normalizedEmail)) {
    res.status(409).json({ message: "Já existe uma conta com esse email." });
    return;
  }

  const user = {
    id: makeId("user"),
    full_name: String(fullName).trim(),
    email: normalizedEmail,
    role: accounts.length === 0 ? "admin" : "user",
    subscription_status: accounts.length === 0 ? "active" : "inactive",
    created_date: nowIso(),
    passwordHash: createPasswordHash(String(password)),
  };

  accounts.push(user);
  await saveAccounts(accounts);
  await saveUserData(user, createSeedUserData(user));
  const token = await createSessionForUser(user.id);

  res.status(201).json({
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      subscription_status: user.subscription_status,
      created_date: user.created_date,
    },
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const accounts = await getAccounts();
  const user = accounts.find((account) => account.email === normalizedEmail);

  if (!user || !verifyPassword(String(password || ""), user.passwordHash)) {
    res.status(401).json({ message: "Email ou senha inválidos." });
    return;
  }

  const token = await createSessionForUser(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      subscription_status: user.subscription_status,
      created_date: user.created_date,
    },
  });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  const { passwordHash, ...user } = req.user;
  res.json(user);
});

app.post("/api/auth/logout", requireAuth, async (req, res) => {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
  const sessions = await getSessions();
  await saveSessions(sessions.filter((entry) => entry.token !== token));
  res.json({ success: true });
});

app.get("/api/entities/:entityName", requireAuth, async (req, res) => {
  const { entityName } = req.params;
  const { sortBy, limit } = req.query;

  if (entityName === "User") {
    if (req.user.role !== "admin") {
      res.status(403).json({ message: "Acesso restrito a administradores." });
      return;
    }
    const accounts = await getAccounts();
    const users = accounts.map(({ passwordHash, ...user }) => user);
    res.json(limitItems(sortItems(users, sortBy), limit));
    return;
  }

  if (!ENTITY_NAMES.includes(entityName)) {
    res.status(404).json({ message: "Entidade não encontrada." });
    return;
  }

  const data = await readUserData(req.user);
  const records = data.entities[entityName] || [];
  res.json(limitItems(sortItems(records, sortBy), limit));
});

app.post("/api/entities/:entityName/filter", requireAuth, async (req, res) => {
  const { entityName } = req.params;
  const { query = {}, sortBy, limit } = req.body || {};

  if (entityName === "User") {
    if (req.user.role !== "admin") {
      res.status(403).json({ message: "Acesso restrito a administradores." });
      return;
    }
    const accounts = await getAccounts();
    const users = accounts
      .map(({ passwordHash, ...user }) => user)
      .filter((user) => Object.entries(query).every(([key, value]) => user[key] === value));
    res.json(limitItems(sortItems(users, sortBy), limit));
    return;
  }

  if (!ENTITY_NAMES.includes(entityName)) {
    res.status(404).json({ message: "Entidade não encontrada." });
    return;
  }

  const data = await readUserData(req.user);
  const records = (data.entities[entityName] || []).filter((record) =>
    Object.entries(query).every(([key, value]) => record[key] === value)
  );
  res.json(limitItems(sortItems(records, sortBy), limit));
});

app.post("/api/entities/:entityName", requireAuth, async (req, res) => {
  const { entityName } = req.params;
  if (!ENTITY_NAMES.includes(entityName)) {
    res.status(404).json({ message: "Entidade não encontrada." });
    return;
  }

  const data = await readUserData(req.user);
  const record = {
    id: makeId(entityName),
    ...req.body,
    created_by: req.user.email,
    created_date: nowIso(),
    updated_date: nowIso(),
  };
  data.entities[entityName].push(record);
  await saveUserData(req.user, data);
  res.status(201).json(record);
});

app.patch("/api/entities/:entityName/:id", requireAuth, async (req, res) => {
  const { entityName, id } = req.params;

  if (entityName === "User") {
    if (req.user.role !== "admin") {
      res.status(403).json({ message: "Acesso restrito a administradores." });
      return;
    }
    const accounts = await getAccounts();
    const index = accounts.findIndex((account) => account.id === id);
    if (index === -1) {
      res.status(404).json({ message: "Usuário não encontrado." });
      return;
    }

    accounts[index] = {
      ...accounts[index],
      ...req.body,
    };
    await saveAccounts(accounts);
    const { passwordHash, ...user } = accounts[index];
    res.json(user);
    return;
  }

  if (!ENTITY_NAMES.includes(entityName)) {
    res.status(404).json({ message: "Entidade não encontrada." });
    return;
  }

  const data = await readUserData(req.user);
  const records = data.entities[entityName];
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) {
    res.status(404).json({ message: "Registro não encontrado." });
    return;
  }

  records[index] = {
    ...records[index],
    ...req.body,
    updated_date: nowIso(),
  };

  await saveUserData(req.user, data);
  res.json(records[index]);
});

app.delete("/api/entities/:entityName/:id", requireAuth, async (req, res) => {
  const { entityName, id } = req.params;

  if (entityName === "User") {
    if (req.user.role !== "admin") {
      res.status(403).json({ message: "Acesso restrito a administradores." });
      return;
    }
    const accounts = await getAccounts();
    const index = accounts.findIndex((account) => account.id === id);
    if (index === -1) {
      res.json({ success: true });
      return;
    }
    const [removed] = accounts.splice(index, 1);
    await saveAccounts(accounts);
    const filePath = getUserFilePath(removed.id, removed.email);
    await fs.rm(filePath, { force: true });
    res.json({ success: true });
    return;
  }

  if (!ENTITY_NAMES.includes(entityName)) {
    res.status(404).json({ message: "Entidade não encontrada." });
    return;
  }

  const data = await readUserData(req.user);
  data.entities[entityName] = data.entities[entityName].filter((record) => record.id !== id);
  await saveUserData(req.user, data);
  res.json({ success: true });
});

const start = async () => {
  await bootstrapStorage();
  app.listen(PORT, () => {
    console.log(`Local API running on http://127.0.0.1:${PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start local API:", error);
  process.exit(1);
});
