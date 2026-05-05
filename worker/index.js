const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    const path = url.pathname;
    const db = env.DB;

    try {
      // Tasks
      if (path === "/api/tasks" && req.method === "GET") {
        const { results } = await db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all();
        return json(results);
      }
      if (path === "/api/tasks" && req.method === "POST") {
        const t = await req.json();
        const { meta } = await db.prepare(
          "INSERT INTO tasks (cat,title,due,stars,status,memo,waiting_for,guide,archived,completed_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
        ).bind(t.cat,t.title,t.due||null,t.stars,t.status,t.memo||"",t.waiting_for||"",t.guide||"",t.archived?1:0,t.completedAt||null).run();
        return json({ id: meta.last_row_id });
      }
      if (path.startsWith("/api/tasks/") && req.method === "PUT") {
        const id = path.split("/").pop();
        const t = await req.json();
        await db.prepare(
          "UPDATE tasks SET cat=?,title=?,due=?,stars=?,status=?,memo=?,waiting_for=?,guide=?,archived=?,completed_at=?,updated_at=datetime('now','localtime') WHERE id=?"
        ).bind(t.cat,t.title,t.due||null,t.stars,t.status,t.memo||"",t.waiting_for||"",t.guide||"",t.archived?1:0,t.completedAt||null,id).run();
        return json({ ok: true });
      }
      if (path.startsWith("/api/tasks/") && req.method === "DELETE") {
        const id = path.split("/").pop();
        await db.prepare("DELETE FROM tasks WHERE id=?").bind(id).run();
        return json({ ok: true });
      }

      // Categories
      if (path === "/api/categories" && req.method === "GET") {
        const { results } = await db.prepare("SELECT * FROM categories ORDER BY sort_order").all();
        return json(results);
      }
      if (path === "/api/categories" && req.method === "POST") {
        const { name } = await req.json();
        const max = await db.prepare("SELECT MAX(sort_order) as m FROM categories").first();
        await db.prepare("INSERT INTO categories (name,sort_order) VALUES (?,?)").bind(name,(max.m||0)+1).run();
        return json({ ok: true });
      }
      if (path.startsWith("/api/categories/") && req.method === "PUT") {
        const id = path.split("/").pop();
        const { name } = await req.json();
        await db.prepare("UPDATE categories SET name=? WHERE id=?").bind(name,id).run();
        return json({ ok: true });
      }
      if (path.startsWith("/api/categories/") && req.method === "DELETE") {
        const id = path.split("/").pop();
        await db.prepare("DELETE FROM categories WHERE id=?").bind(id).run();
        return json({ ok: true });
      }

      // Files
      if (path === "/api/files" && req.method === "GET") {
        const { results } = await db.prepare("SELECT * FROM files ORDER BY updated_at DESC").all();
        return json(results);
      }
      if (path === "/api/files" && req.method === "POST") {
        const f = await req.json();
        const { meta } = await db.prepare(
          "INSERT INTO files (name,type,url,memo,tag) VALUES (?,?,?,?,?)"
        ).bind(f.name,f.type||"url",f.url||"",f.memo||"",f.tag||"기타").run();
        return json({ id: meta.last_row_id });
      }
      if (path.startsWith("/api/files/") && req.method === "PUT") {
        const id = path.split("/").pop();
        const f = await req.json();
        await db.prepare(
          "UPDATE files SET name=?,type=?,url=?,memo=?,tag=?,updated_at=datetime('now','localtime') WHERE id=?"
        ).bind(f.name,f.type||"url",f.url||"",f.memo||"",f.tag||"기타",id).run();
        return json({ ok: true });
      }
      if (path.startsWith("/api/files/") && req.method === "DELETE") {
        const id = path.split("/").pop();
        await db.prepare("DELETE FROM files WHERE id=?").bind(id).run();
        return json({ ok: true });
      }

      return json({ error: "Not found" }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};