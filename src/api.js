const BASE = "https://task-manager-worker.ybkim-195.workers.dev";

// 세션 관리
export const session = {
  get: () => localStorage.getItem("session_id"),
  set: (id) => localStorage.setItem("session_id", id),
  clear: () => localStorage.removeItem("session_id"),
};

// 공통 fetch (자동으로 Authorization 헤더 포함)
const req = (path, options = {}) => {
  const sessionId = session.get();
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { Authorization: `Bearer ${sessionId}` } : {}),
      ...(options.headers || {}),
    },
  }).then(r => r.json());
};

export const api = {
  // ── Auth ──────────────────────────────
  login: (email, password) =>
    req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  register: (name, email, password, phone) =>
    req("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password, phone }) }),

  logout: () =>
    req("/api/auth/logout", { method: "POST" }),

  me: () =>
    req("/api/auth/me"),

  resetPassword: (email) =>
    req("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ email }) }),

  changePassword: (currentPassword, newPassword) =>
    req("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }),

  // ── Tasks ─────────────────────────────
  getTasks: () => req("/api/tasks"),
  addTask: task => req("/api/tasks", { method: "POST", body: JSON.stringify(task) }),
  updateTask: (id, t) => req(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(t) }),
  deleteTask: id => req(`/api/tasks/${id}`, { method: "DELETE" }),

  // ── Categories ────────────────────────
  getCategories: () => req("/api/categories"),
  addCategory: name => req("/api/categories", { method: "POST", body: JSON.stringify({ name }) }),
  updateCategory: (id, name) => req(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deleteCategory: id => req(`/api/categories/${id}`, { method: "DELETE" }),

  // ── Files ─────────────────────────────
  getFiles: () => req("/api/files"),
  addFile: file => req("/api/files", { method: "POST", body: JSON.stringify(file) }),
  updateFile: (id, f) => req(`/api/files/${id}`, { method: "PUT", body: JSON.stringify(f) }),
  deleteFile: id => req(`/api/files/${id}`, { method: "DELETE" }),
};