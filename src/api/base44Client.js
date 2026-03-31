const SESSION_TOKEN_KEY = "kash_session_token";
const ENTITY_NAMES = ["User", "Transaction", "Budget", "Savings", "PaymentReminder", "ShoppingItem", "PaidList"];

const clone = (value) => JSON.parse(JSON.stringify(value));

const getSessionToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(SESSION_TOKEN_KEY);
};

const setSessionToken = (token) => {
  if (typeof window === "undefined") {
    return;
  }
  if (token) {
    window.localStorage.setItem(SESSION_TOKEN_KEY, token);
    return;
  }
  window.localStorage.removeItem(SESSION_TOKEN_KEY);
};

const request = async (path, { method = "GET", body } = {}) => {
  const token = getSessionToken();
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.message || "Falha na comunicação com a API.");
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  return payload;
};

const createEntityApi = (entityName) => ({
  list: (sortBy, limit) => {
    const query = new URLSearchParams();
    if (sortBy) query.set("sortBy", sortBy);
    if (limit != null) query.set("limit", String(limit));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request(`/api/entities/${entityName}${suffix}`);
  },
  filter: (query, sortBy, limit) =>
    request(`/api/entities/${entityName}/filter`, {
      method: "POST",
      body: { query, sortBy, limit },
    }),
  create: (payload) =>
    request(`/api/entities/${entityName}`, {
      method: "POST",
      body: payload,
    }),
  update: (id, payload) =>
    request(`/api/entities/${entityName}/${id}`, {
      method: "PATCH",
      body: payload,
    }),
  delete: (id) =>
    request(`/api/entities/${entityName}/${id}`, {
      method: "DELETE",
    }),
});

export const base44 = {
  entities: Object.fromEntries(ENTITY_NAMES.map((name) => [name, createEntityApi(name)])),
  auth: {
    async register(payload) {
      return request("/api/auth/register", {
        method: "POST",
        body: payload,
      });
    },
    async login(payload) {
      const data = await request("/api/auth/login", {
        method: "POST",
        body: payload,
      });
      setSessionToken(data.token);
      return clone(data.user);
    },
    async loginWithGoogle(payload) {
      const data = await request("/api/auth/google", {
        method: "POST",
        body: payload,
      });
      setSessionToken(data.token);
      return clone(data.user);
    },
    async me() {
      return request("/api/auth/me");
    },
    async verifyEmail(payload) {
      return request("/api/auth/verify-email", {
        method: "POST",
        body: payload,
      });
    },
    async resendVerification(payload) {
      return request("/api/auth/resend-verification", {
        method: "POST",
        body: payload,
      });
    },
    async updateProfile(payload) {
      return request("/api/auth/profile", {
        method: "PATCH",
        body: payload,
      });
    },
    async changePassword(payload) {
      return request("/api/auth/change-password", {
        method: "POST",
        body: payload,
      });
    },
    async cancelSubscription() {
      return request("/api/auth/cancel-subscription", {
        method: "POST",
      });
    },
    async createPremiumCheckout(payload) {
      return request("/api/auth/create-premium-checkout", {
        method: "POST",
        body: payload,
      });
    },
    async logout() {
      try {
        await request("/api/auth/logout", { method: "POST" });
      } finally {
        setSessionToken(null);
      }
    },
    getToken() {
      return getSessionToken();
    },
  },
};
