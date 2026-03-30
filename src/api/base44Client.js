const STORAGE_KEY = "kash_local_db_v1";
const AUTH_EVENT = "kash-auth-changed";
const ENTITY_NAMES = [
  "User",
  "Transaction",
  "Budget",
  "Savings",
  "PaymentReminder",
  "ShoppingItem",
  "PaidList",
];

let memoryState = null;

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const clone = (value) => JSON.parse(JSON.stringify(value));

const emitAuthChange = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT));
  }
};

const makeId = (prefix) => `${prefix.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const nowIso = () => new Date().toISOString();

const createInitialState = () => {
  const today = new Date();
  const isoDate = (date) => date.toISOString().split("T")[0];
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const adminId = "user_local_admin";
  const premiumId = "user_demo_premium";
  const currentUserEmail = "admin@kash.local";

  return {
    currentUserId: adminId,
    users: [
      {
        id: adminId,
        full_name: "Administrador Local",
        email: currentUserEmail,
        role: "admin",
        subscription_status: "active",
        created_date: nowIso(),
      },
      {
        id: premiumId,
        full_name: "Usuário Premium Demo",
        email: "premium@kash.local",
        role: "premium",
        subscription_status: "active",
        created_date: nowIso(),
      },
    ],
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
          created_by: currentUserEmail,
          created_date: nowIso(),
        },
        {
          id: makeId("transaction"),
          description: "Supermercado",
          amount: 420.75,
          type: "despesa",
          category: "Alimentação",
          date: isoDate(new Date(today.getFullYear(), today.getMonth(), 8)),
          notes: "",
          created_by: currentUserEmail,
          created_date: nowIso(),
        },
        {
          id: makeId("transaction"),
          description: "Internet",
          amount: 129.9,
          type: "despesa",
          category: "Moradia",
          date: isoDate(new Date(today.getFullYear(), today.getMonth(), 10)),
          notes: "",
          created_by: currentUserEmail,
          created_date: nowIso(),
        },
      ],
      Budget: [
        {
          id: makeId("budget"),
          category: "Alimentação",
          limit_amount: 1200,
          month: currentMonth,
          created_by: currentUserEmail,
          created_date: nowIso(),
        },
        {
          id: makeId("budget"),
          category: "Moradia",
          limit_amount: 2000,
          month: currentMonth,
          created_by: currentUserEmail,
          created_date: nowIso(),
        },
      ],
      Savings: [
        {
          id: makeId("savings"),
          name: "Reserva de emergência",
          amount: 3500,
          goal_amount: 10000,
          monthly_deposit: 500,
          description: "Fundo de segurança",
          icon: "🐷",
          created_by: currentUserEmail,
          created_date: nowIso(),
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
          created_by: currentUserEmail,
          created_date: nowIso(),
        },
      ],
      ShoppingItem: [
        {
          id: makeId("shoppingitem"),
          name: "Arroz",
          price: 32.9,
          quantity: 1,
          unit: "pacote",
          checked: true,
          created_date: nowIso(),
        },
        {
          id: makeId("shoppingitem"),
          name: "Leite",
          price: 6.5,
          quantity: 6,
          unit: "unidade",
          checked: false,
          created_date: nowIso(),
        },
      ],
      PaidList: [],
    },
  };
};

const loadState = () => {
  if (!canUseStorage()) {
    if (!memoryState) {
      memoryState = createInitialState();
    }
    return memoryState;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = createInitialState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    const initial = createInitialState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
};

const saveState = (state) => {
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return;
  }
  memoryState = state;
};

const ensureState = () => {
  const state = loadState();
  if (!state.users?.length) {
    const initial = createInitialState();
    saveState(initial);
    return initial;
  }
  if (!state.entities) {
    state.entities = Object.fromEntries(ENTITY_NAMES.filter((name) => name !== "User").map((name) => [name, []]));
    saveState(state);
  }
  if (!state.currentUserId || !state.users.find((user) => user.id === state.currentUserId)) {
    state.currentUserId = state.users[0].id;
    saveState(state);
    emitAuthChange();
  }
  return state;
};

const getCurrentUser = () => {
  const state = ensureState();
  return state.users.find((user) => user.id === state.currentUserId) || null;
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

const listRecords = async (entityName, sortBy, limit) => {
  const state = ensureState();
  const records = entityName === "User" ? state.users : state.entities[entityName] || [];
  return clone(limitItems(sortItems(records, sortBy), limit));
};

const filterRecords = async (entityName, query = {}, sortBy, limit) => {
  const state = ensureState();
  const records = entityName === "User" ? state.users : state.entities[entityName] || [];
  const filtered = records.filter((record) =>
    Object.entries(query).every(([key, value]) => record[key] === value)
  );
  return clone(limitItems(sortItems(filtered, sortBy), limit));
};

const createRecord = async (entityName, payload) => {
  const state = ensureState();
  const currentUser = getCurrentUser();
  const baseRecord = {
    id: makeId(entityName),
    ...payload,
    created_date: nowIso(),
    updated_date: nowIso(),
  };

  if (entityName !== "User" && currentUser?.email && !baseRecord.created_by) {
    baseRecord.created_by = currentUser.email;
  }

  if (entityName === "User") {
    baseRecord.role ??= "user";
    baseRecord.subscription_status ??= "inactive";
    state.users.push(baseRecord);
  } else {
    state.entities[entityName].push(baseRecord);
  }

  saveState(state);
  if (entityName === "User") {
    emitAuthChange();
  }
  return clone(baseRecord);
};

const updateRecord = async (entityName, id, payload) => {
  const state = ensureState();
  const collection = entityName === "User" ? state.users : state.entities[entityName] || [];
  const index = collection.findIndex((record) => record.id === id);
  if (index === -1) {
    throw new Error(`${entityName} ${id} not found`);
  }

  collection[index] = {
    ...collection[index],
    ...payload,
    updated_date: nowIso(),
  };

  saveState(state);
  if (entityName === "User" && id === state.currentUserId) {
    emitAuthChange();
  }
  return clone(collection[index]);
};

const deleteRecord = async (entityName, id) => {
  const state = ensureState();
  const collection = entityName === "User" ? state.users : state.entities[entityName] || [];
  const index = collection.findIndex((record) => record.id === id);
  if (index === -1) {
    return { success: true };
  }

  const [removed] = collection.splice(index, 1);
  if (entityName === "User" && state.currentUserId === id) {
    state.currentUserId = state.users[0]?.id ?? null;
    emitAuthChange();
  }

  saveState(state);
  return clone(removed);
};

const createEntityApi = (entityName) => ({
  list: (sortBy, limit) => listRecords(entityName, sortBy, limit),
  filter: (query, sortBy, limit) => filterRecords(entityName, query, sortBy, limit),
  create: (payload) => createRecord(entityName, payload),
  update: (id, payload) => updateRecord(entityName, id, payload),
  delete: (id) => deleteRecord(entityName, id),
});

export const base44 = {
  entities: Object.fromEntries(ENTITY_NAMES.map((name) => [name, createEntityApi(name)])),
  auth: {
    async me() {
      const user = getCurrentUser();
      if (!user) {
        throw new Error("No local user available");
      }
      return clone(user);
    },
    logout() {
      const state = ensureState();
      state.currentUserId = state.users[0]?.id ?? null;
      saveState(state);
      emitAuthChange();
    },
    redirectToLogin() {
      const state = ensureState();
      if (!state.currentUserId && state.users[0]) {
        state.currentUserId = state.users[0].id;
        saveState(state);
        emitAuthChange();
      }
    },
  },
};

export const localBase44AuthEvent = AUTH_EVENT;
