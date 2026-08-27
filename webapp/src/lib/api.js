const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const formatUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.startsWith("/api/")) {
    return `${BASE_URL}${cleanEndpoint}`;
  }
  return `${BASE_URL}/api${cleanEndpoint}`;
};

const getAuthHeaders = () => {
  if (typeof window === "undefined") return {};
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("bearer_token") ||
    sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Lightweight API client wrapping native fetch API.
 * Routes automatically to NestJS global prefix (/api) with credentials & Bearer Auth support.
 */
export const api = {
  async get(endpoint, options = {}) {
    const url = formatUrl(endpoint);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...options.headers,
      },
      credentials: "include",
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API Error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  },

  async post(endpoint, data, options = {}) {
    const url = formatUrl(endpoint);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...options.headers,
      },
      body: JSON.stringify(data),
      credentials: "include",
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API Error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  },

  async put(endpoint, data, options = {}) {
    const url = formatUrl(endpoint);
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...options.headers,
      },
      body: JSON.stringify(data),
      credentials: "include",
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API Error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  },

  async delete(endpoint, options = {}) {
    const url = formatUrl(endpoint);
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...options.headers,
      },
      credentials: "include",
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API Error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  },
};

export default api;
