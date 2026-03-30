const ACCOUNTS_KEY = "kash_accounts_v1";
const SESSION_KEY = "kash_session_v1";
const USER_DATA_PREFIX = "kash_user_data_v1:";
const ENTITY_NAMES = ["User", "Transaction", "Budget", "Savings", "PaymentReminder", "ShoppingItem", "PaidList"];

const clone = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();
const makeId = (prefix) => `${prefix.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const readStorage = (key, fallback) => {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = (key, value) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const removeStorage = (key) => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(key);
};

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

const limitItems = (items, limit) => (typeof limit === "number" ? items.slice(0, limit) : items);

const encodeBase64 = (value) => {
  if (typeof window === "undefined") {
    return value;
  }
  return window.btoa(unescape(encodeURIComponent(value)));
};

const seedUserData = (user) => {
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
          notes: "Entrada inicial",
          created_by: user.email,
          created_date: nowIso(),
          updated_date: nowIso(),
        },
        {
          id: makeId("transaction"),
          description: "Supermercado",
          amount: 320.5,
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
          description: "Meta inicial",
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

const getAccounts = () => readStorage(ACCOUNTS_KEY, []);
const saveAccounts = (accounts) => writeStorage(ACCOUNTS_KEY, accounts);
const getSession = () => readStorage(SESSION_KEY, null);
const saveSession = (session) => writeStorage(SESSION_KEY, session);
const getUserDataKey = (userId) => `${USER_DATA_PREFIX}${userId}`;

const getCurrentAccount = () => {
  const session = getSession();
  if (!session?.userId) {
    return null;
  }
  const accounts = getAccounts();
  return accounts.find((account) => account.id === session.userId) || null;
};

const getUserData = (user) => {
  const fallback = seedUserData(user);
  const data = readStorage(getUserDataKey(user.id), fallback);
  if (!data?.entities) {
    return fallback;
  }
  for (const entityName of ENTITY_NAMES.filter((name) => name !== "User")) {
    if (!Array.isArray(data.entities[entityName])) {
      data.entities[entityName] = [];
    }
  }
  return data;
};

const saveUserData = (user, data) => {
  writeStorage(getUserDataKey(user.id), {
    ...data,
    profile: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      subscription_status: user.subscription_status,
      created_date: user.created_date,
    },
  });
};

const sanitizeUser = (account) => {
  if (!account) return null;
  const { passwordHash, ...safeUser } = account;
  return safeUser;
};

const requireUser = () => {
  const user = getCurrentAccount();
  if (!user) {
    const error = new Error("Sessão inválida ou expirada.");
    error.status = 401;
    throw error;
  }
  return user;
};

const requireAdmin = (user) => {
  if (user.role !== "admin") {
    const error = new Error("Acesso restrito a administradores.");
    error.status = 403;
    throw error;
  }
};

const createEntityApi = (entityName) => ({
  async list(sortBy, limit) {
    const user = requireUser();
    if (entityName === "User") {
      requireAdmin(user);
      return clone(limitItems(sortItems(getAccounts().map(sanitizeUser), sortBy), limit));
    }
    const data = getUserData(user);
    return clone(limitItems(sortItems(data.entities[entityName] || [], sortBy), limit));
  },
  async filter(query = {}, sortBy, limit) {
    const user = requireUser();
    if (entityName === "User") {
      requireAdmin(user);
      const filtered = getAccounts()
        .map(sanitizeUser)
        .filter((record) => Object.entries(query).every(([key, value]) => record[key] === value));
      return clone(limitItems(sortItems(filtered, sortBy), limit));
    }
    const data = getUserData(user);
    const filtered = (data.entities[entityName] || []).filter((record) =>
      Object.entries(query).every(([key, value]) => record[key] === value)
    );
    return clone(limitItems(sortItems(filtered, sortBy), limit));
  },
  async create(payload) {
    const user = requireUser();
    const data = getUserData(user);
    const record = {
      id: makeId(entityName),
      ...payload,
      created_by: user.email,
      created_date: nowIso(),
      updated_date: nowIso(),
    };
    data.entities[entityName].push(record);
    saveUserData(user, data);
    return clone(record);
  },
  async update(id, payload) {
    const user = requireUser();
    if (entityName === "User") {
      requireAdmin(user);
      const accounts = getAccounts();
      const index = accounts.findIndex((account) => account.id === id);
      if (index === -1) {
        throw new Error(`User ${id} not found`);
      }
      accounts[index] = { ...accounts[index], ...payload };
      saveAccounts(accounts);
      const updatedUser = accounts[index];
      const userData = getUserData(updatedUser);
      saveUserData(updatedUser, userData);
      return clone(sanitizeUser(updatedUser));
    }
    const data = getUserData(user);
    const records = data.entities[entityName] || [];
    const index = records.findIndex((record) => record.id === id);
    if (index === -1) {
      throw new Error(`${entityName} ${id} not found`);
    }
    records[index] = {
      ...records[index],
      ...payload,
      updated_date: nowIso(),
    };
    saveUserData(user, data);
    return clone(records[index]);
  },
  async delete(id) {
    const user = requireUser();
    if (entityName === "User") {
      requireAdmin(user);
      const accounts = getAccounts();
      const remaining = accounts.filter((account) => account.id !== id);
      saveAccounts(remaining);
      removeStorage(getUserDataKey(id));
      const session = getSession();
      if (session?.userId === id) {
        removeStorage(SESSION_KEY);
      }
      return { success: true };
    }
    const data = getUserData(user);
    data.entities[entityName] = (data.entities[entityName] || []).filter((record) => record.id !== id);
    saveUserData(user, data);
    return { success: true };
  },
});

export const base44 = {
  entities: Object.fromEntries(ENTITY_NAMES.map((name) => [name, createEntityApi(name)])),
  auth: {
    async register({ fullName, email, password }) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const accounts = getAccounts();
      if (accounts.some((account) => account.email === normalizedEmail)) {
        const error = new Error("Já existe uma conta com esse email.");
        error.status = 409;
        throw error;
      }

      const account = {
        id: makeId("user"),
        full_name: String(fullName).trim(),
        email: normalizedEmail,
        role: accounts.length === 0 ? "admin" : "user",
        subscription_status: accounts.length === 0 ? "active" : "inactive",
        created_date: nowIso(),
        passwordHash: encodeBase64(password),
      };

      accounts.push(account);
      saveAccounts(accounts);
      saveUserData(account, seedUserData(account));
      saveSession({ userId: account.id, createdAt: nowIso() });
      return clone(sanitizeUser(account));
    },
    async login({ email, password }) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const account = getAccounts().find((item) => item.email === normalizedEmail);
      if (!account || account.passwordHash !== encodeBase64(password)) {
        const error = new Error("Email ou senha inválidos.");
        error.status = 401;
        throw error;
      }
      saveSession({ userId: account.id, createdAt: nowIso() });
      return clone(sanitizeUser(account));
    },
    async me() {
      const user = requireUser();
      return clone(sanitizeUser(user));
    },
    async logout() {
      removeStorage(SESSION_KEY);
    },
    getToken() {
      const session = getSession();
      return session?.userId || null;
    },
  },
};
