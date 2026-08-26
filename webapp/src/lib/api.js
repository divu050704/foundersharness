const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const formatUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.startsWith("/api/")) {
    return `${BASE_URL}${cleanEndpoint}`;
  }
  return `${BASE_URL}/api${cleanEndpoint}`;
};

/**
 * Lightweight API client wrapping native fetch API.
 * Routes automatically to NestJS global prefix (/api).
 */
export const api = {
  async get(endpoint, options = {}) {
    const url = formatUrl(endpoint);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  },

  async post(endpoint, data, options = {}) {
    const url = formatUrl(endpoint);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
      credentials: "include"
    });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  },

  async put(endpoint, data, options = {}) {
    const url = formatUrl(endpoint);
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: JSON.stringify(data),
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  },

  async delete(endpoint, options = {}) {
    const url = formatUrl(endpoint);
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }
    return res.json();
  },
};

export default api;
