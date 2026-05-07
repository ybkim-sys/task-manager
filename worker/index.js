const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS } });

// 간단한 해시 함수 (SHA-256)
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// 랜덤 세션 ID 생성
function generateSessionId() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

// 세션으로 유저 확인
async function getUser(req, db) {
  const auth = req.headers.get("Authorization") || "";
  const sessionId = auth.replace("Bearer ", "").trim();
  if (!sessionId) return null;
  const session = await db.prepare(
    "SELECT u.* FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.id=?"
  ).bind(sessionId).first();
  return session || null;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(req.url);
    const path = url.pathname;
    const db = env.DB;

    try {

      // ── Auth ──────────────────────────────────────────

      // 회원가입
      if (path === "/api/auth/register" && req.method === "POST") {
        const { name, email, password, phone } = await req.json();
        if (!name || !email || !password) return json({ error: "필수 항목을 입력해주세요" }, 400);
        if (!email.endsWith("@gcsc.co.kr")) return json({ error: "gcsc.co.kr 이메일만 가입할 수 있어요" }, 403);
        const existing = await db.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
        if (existing) return json({ error: "이미 사용 중인 이메일이에요" }, 400);
        const hash = await hashPassword(password);
        await db.prepare("INSERT INTO users (name,email,password_hash,phone) VALUES (?,?,?,?)")
          .bind(name, email, hash, phone||"").run();
        return json({ ok: true });
      }

      // 로그인
      if (path === "/api/auth/login" && req.method === "POST") {
        const { email, password } = await req.json();
        const user = await db.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
        if (!user) return json({ error: "이메일 또는 비밀번호가 틀렸어요" }, 401);
        const hash = await hashPassword(password);
        if (hash !== user.password_hash) return json({ error: "이메일 또는 비밀번호가 틀렸어요" }, 401);
        const sessionId = generateSessionId();
        await db.prepare("INSERT INTO sessions (id,user_id) VALUES (?,?)").bind(sessionId, user.id).run();
        return json({ sessionId, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
      }

      // 로그아웃
      if (path === "/api/auth/logout" && req.method === "POST") {
        const auth = req.headers.get("Authorization") || "";
        const sessionId = auth.replace("Bearer ", "").trim();
        if (sessionId) await db.prepare("DELETE FROM sessions WHERE id=?").bind(sessionId).run();
        return json({ ok: true });
      }

      // 내 정보 확인
      if (path === "/api/auth/me" && req.method === "GET") {
        const user = await getUser(req, db);
        if (!user) return json({ error: "인증 필요" }, 401);
        return json({ id: user.id, name: user.name, email: user.email, role: user.role });
      }

      // 비밀번호 초기화 (이메일로 임시 비밀번호 발급)
      if (path === "/api/auth/reset-password" && req.method === "POST") {
        const { email } = await req.json();
        if (!email.endsWith("@gcsc.co.kr")) return json({ error: "gcsc.co.kr 이메일만 사용할 수 있어요" }, 403);
        const user = await db.prepare("SELECT * FROM users WHERE email=?").bind(email).first();
        if (!user) return json({ error: "등록되지 않은 이메일이에요" }, 404);
        // 8자리 임시 비밀번호 생성
        const tempPw = Math.random().toString(36).slice(-4) + Math.random().toString(36).slice(-4);
        const hash = await hashPassword(tempPw);
        await db.prepare("UPDATE users SET password_hash=? WHERE email=?").bind(hash, email).run();
        return json({ ok: true, tempPassword: tempPw });
      }
     // subtitle 저장
      if (path === "/api/auth/subtitle" && req.method === "PUT") {
        const { subtitle } = await req.json();
        const u = await getUser(req, db);
        if (!u) return json({ error: "인증 필요" }, 401);
        await db.prepare("UPDATE users SET subtitle=? WHERE id=?").bind(subtitle, u.id).run();
        return json({ ok: true });
      }
      // 비밀번호 변경
      if (path === "/api/auth/change-password" && req.method === "POST") {
        const user = await getUser(req, db);
        if (!user) return json({ error: "인증 필요" }, 401);
        const { currentPassword, newPassword } = await req.json();
        const hash = await hashPassword(currentPassword);
        if (hash !== user.password_hash) return json({ error: "현재 비밀번호가 틀렸어요" }, 401);
        const newHash = await hashPassword(newPassword);
        await db.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(newHash, user.id).run();
        return json({ ok: true });
      }

      // ── 아래부터는 로그인 필요 ──────────────────────────

      const user = await getUser(req, db);
      if (!user) return json({ error: "로그인이 필요해요" }, 401);

      // ── Tasks ─────────────────────────────────────────

      if (path === "/api/tasks" && req.method === "GET") {
        const { results } = await db.prepare(
          "SELECT * FROM tasks WHERE user_id=? ORDER BY created_at DESC"
        ).bind(user.id).all();
        return json(results);
      }

      if (path === "/api/tasks" && req.method === "POST") {
        const t = await req.json();
        const { meta } = await db.prepare(
          "INSERT INTO tasks (cat,title,due,stars,status,memo,waiting_for,guide,archived,completed_at,user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
        ).bind(t.cat,t.title,t.due||null,t.stars,t.status,t.memo||"",t.waiting_for||"",t.guide||"",t.archived?1:0,t.completedAt||null,user.id).run();
        return json({ id: meta.last_row_id });
      }

      if (path.startsWith("/api/tasks/") && req.method === "PUT") {
        const id = path.split("/").pop();
        const t = await req.json();
        await db.prepare(
          "UPDATE tasks SET cat=?,title=?,due=?,stars=?,status=?,memo=?,waiting_for=?,guide=?,archived=?,completed_at=?,updated_at=datetime('now','localtime') WHERE id=? AND user_id=?"
        ).bind(t.cat,t.title,t.due||null,t.stars,t.status,t.memo||"",t.waiting_for||"",t.guide||"",t.archived?1:0,t.completedAt||null,id,user.id).run();
        return json({ ok: true });
      }

      if (path.startsWith("/api/tasks/") && req.method === "DELETE") {
        const id = path.split("/").pop();
        await db.prepare("DELETE FROM tasks WHERE id=? AND user_id=?").bind(id, user.id).run();
        return json({ ok: true });
      }

      // ── Categories ────────────────────────────────────

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
        await db.prepare("UPDATE categories SET name=? WHERE id=?").bind(name, id).run();
        return json({ ok: true });
      }

      if (path.startsWith("/api/categories/") && req.method === "DELETE") {
        const id = path.split("/").pop();
        await db.prepare("DELETE FROM categories WHERE id=?").bind(id).run();
        return json({ ok: true });
      }

      // ── Files ─────────────────────────────────────────

      if (path === "/api/files" && req.method === "GET") {
        const { results } = await db.prepare(
          "SELECT * FROM files WHERE user_id=? ORDER BY updated_at DESC"
        ).bind(user.id).all();
        return json(results);
      }

      if (path === "/api/files" && req.method === "POST") {
        const f = await req.json();
        const { meta } = await db.prepare(
          "INSERT INTO files (name,type,url,memo,tag,user_id) VALUES (?,?,?,?,?,?)"
        ).bind(f.name,f.type||"url",f.url||"",f.memo||"",f.tag||"기타",user.id).run();
        return json({ id: meta.last_row_id });
      }

      if (path.startsWith("/api/files/") && req.method === "PUT") {
        const id = path.split("/").pop();
        const f = await req.json();
        await db.prepare(
          "UPDATE files SET name=?,type=?,url=?,memo=?,tag=?,updated_at=datetime('now','localtime') WHERE id=? AND user_id=?"
        ).bind(f.name,f.type||"url",f.url||"",f.memo||"",f.tag||"기타",id,user.id).run();
        return json({ ok: true });
      }

      if (path.startsWith("/api/files/") && req.method === "DELETE") {
        const id = path.split("/").pop();
        await db.prepare("DELETE FROM files WHERE id=? AND user_id=?").bind(id, user.id).run();
        return json({ ok: true });
      }

      return json({ error: "Not found" }, 404);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  },
};
