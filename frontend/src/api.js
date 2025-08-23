const DEFAULT_TIMEOUT_MS = 15_000;

export const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE) ||
  "/api";

/** Ensure path starts with a single leading slash (unless absolute). */
function normalizePath(p) {
  if (!p) return "/";
  if (/^https?:\/\//i.test(p)) return p;
  return p.startsWith("/") ? p : `/${p}`;
}

/** Read `{ token, user }` from localStorage. */
function readAuth() {
  try {
    const raw = localStorage.getItem("app.auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Build a URL with optional query params.
 * @param {string} base - base URL
 * @param {string} path - path starting with '/' or absolute URL
 * @param {Record<string, any>} [params] - query params
 */
function buildUrl(base, path, params) {
  const finalPath = normalizePath(path);
  const isAbsolute = /^https?:\/\//i.test(finalPath);
  const url = new URL(isAbsolute ? finalPath : `${base}${finalPath}`, window.location.origin);
  if (params && typeof params === "object") {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        v.forEach((val) => url.searchParams.append(k, String(val)));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

/** Try to parse a response body smartly. */
async function parseResponse(res) {
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

/** Pull a helpful error message out of arbitrary shapes. */
function extractErrorMessage(data, res) {
  if (!data) return `API ${res.status} ${res.statusText || ""}`.trim();
  return (
    data.error ||
    data.message ||
    (typeof data === "string" ? data : `API ${res.status} ${res.statusText || ""}`.trim())
  );
}

/**
 * Core API call.
 * @param {string} path - '/videos', '/creator/video', etc. (or absolute URL)
 * @param {object} [options]
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [options.method='GET']
 * @param {object} [options.params] - query params
 * @param {any} [options.body] - will be JSON.stringified if object
 * @param {object} [options.headers]
 * @param {AbortSignal} [options.signal]
 * @param {number} [options.timeoutMs=15000]
 * @param {string} [options.userEmail] - dev-only override; sets 'x-user-email'
 * @param {string} [options.adminKey] - sets 'x-admin-key' header
 */
export async function api(path, options = {}) {
  const {
    method = "GET",
    params,
    body,
    headers = {},
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    userEmail,
    adminKey,
  } = options;

  const url = buildUrl(API_BASE, path, params);

  // Compose headers
  const finalHeaders = new Headers(headers);

  // Attach Bearer token unless caller already provided Authorization
  if (!finalHeaders.has("Authorization")) {
    const auth = readAuth();
    const token = auth?.token;
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  // JSON body handling
  let fetchBody = body;
  if (body !== undefined && body !== null && typeof body !== "string") {
    fetchBody = JSON.stringify(body);
    if (!finalHeaders.has("Content-Type")) {
      finalHeaders.set("Content-Type", "application/json");
    }
  }

  // Dev auth header (legacy/local only)
  const emailFromStorage =
    typeof localStorage !== "undefined" ? localStorage.getItem("dev.userEmail") : null;
  const effectiveEmail = userEmail || emailFromStorage;
  if (effectiveEmail && !finalHeaders.has("x-user-email")) {
    finalHeaders.set("x-user-email", effectiveEmail);
  }

  // Optional admin header for management endpoints
  if (adminKey && !finalHeaders.has("x-admin-key")) {
    finalHeaders.set("x-admin-key", adminKey);
  }

  // Timeout support
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(new Error("Request timed out")),
    timeoutMs
  );
  if (signal) {
    const onAbort = () => controller.abort(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: fetchBody,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const message =
      err?.name === "AbortError"
        ? "Request aborted or timed out"
        : err?.message || "Network error";
    const e = new Error(message);
    e.cause = err;
    e.status = 0;
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await parseResponse(res);

  if (!res.ok) {
    const message = extractErrorMessage(data, res);
    const e = new Error(message);
    e.status = res.status;
    e.data = data;
    throw e;
  }

  return data;
}

// Shorthand helpers
api.get = (path, options = {}) => api(path, { ...options, method: "GET" });
api.post = (path, body, options = {}) => api(path, { ...options, method: "POST", body });
api.put = (path, body, options = {}) => api(path, { ...options, method: "PUT", body });
api.patch = (path, body, options = {}) => api(path, { ...options, method: "PATCH", body });
api.del = (path, options = {}) => api(path, { ...options, method: "DELETE" });

/** Set or clear the dev email (handy in a quick “fake login”). */
export function setDevUserEmail(email) {
  if (typeof localStorage !== "undefined") {
    if (email) localStorage.setItem("dev.userEmail", email);
    else localStorage.removeItem("dev.userEmail");
  }
}

/* ---------- Optional endpoint-specific helpers (nice DX) ---------- */
export const Api = {
  // health
  health: () => api.get("/health"),

  // videos
  listVideos: () => api.get("/videos"),
  getVideo: (id) => api.get(`/videos/${id}`),

  // creator actions
  getUploadSas: () => api.get("/creator/video/sas"),
  createVideo: (payload) => api.post("/creator/video", payload),

  // interactions
  postComment: (videoId, text) =>
    api.post(`/videos/${videoId}/comments`, { text }),
  postRating: (videoId, stars) =>
    api.post(`/videos/${videoId}/ratings`, { stars }),

  // admin
  setRole: (email, role, adminKey) =>
    api.post(
      "/manage/set-role",
      { email, role },
      { adminKey }
    ),
};