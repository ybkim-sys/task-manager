const BASE = "https://task-manager-worker.ybkim-195.workers.dev";

export const api = {
  // Tasks
  getTasks:   ()      => fetch(`${BASE}/api/tasks`).then(r=>r.json()),
  addTask:    task    => fetch(`${BASE}/api/tasks`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(task) }).then(r=>r.json()),
  updateTask: (id, t) => fetch(`${BASE}/api/tasks/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(t) }).then(r=>r.json()),
  deleteTask: id      => fetch(`${BASE}/api/tasks/${id}`, { method:"DELETE" }).then(r=>r.json()),

  // Categories
  getCategories:   ()       => fetch(`${BASE}/api/categories`).then(r=>r.json()),
  addCategory:     name     => fetch(`${BASE}/api/categories`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name}) }).then(r=>r.json()),
  updateCategory:  (id, name) => fetch(`${BASE}/api/categories/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name}) }).then(r=>r.json()),
  deleteCategory:  id       => fetch(`${BASE}/api/categories/${id}`, { method:"DELETE" }).then(r=>r.json()),

  // Files
  getFiles:   ()     => fetch(`${BASE}/api/files`).then(r=>r.json()),
  addFile:    file   => fetch(`${BASE}/api/files`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(file) }).then(r=>r.json()),
  updateFile: (id,f) => fetch(`${BASE}/api/files/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(f) }).then(r=>r.json()),
  deleteFile: id     => fetch(`${BASE}/api/files/${id}`, { method:"DELETE" }).then(r=>r.json()),
};