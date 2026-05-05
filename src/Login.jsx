import { useState } from "react";
import { api, session } from "./api.js";

export default function Login({ onLogin }) {
  const [tab, setTab]       = useState("login"); // login | register | reset
  const [name, setName]     = useState("");
  const [email, setEmail]   = useState("");
  const [phone, setPhone]   = useState("");
  const [pw, setPw]         = useState("");
  const [pw2, setPw2]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [msg, setMsg]       = useState("");

  const clear = () => { setError(""); setMsg(""); };

  const handleLogin = async () => {
    if (!email || !pw) { setError("이메일과 비밀번호를 입력해주세요"); return; }
    setLoading(true); clear();
    const res = await api.login(email, pw);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    session.set(res.sessionId);
    onLogin(res.user);
  };

  const handleRegister = async () => {
    if (!name || !email || !pw) { setError("이름, 이메일, 비밀번호를 입력해주세요"); return; }
    if (!email.endsWith("@gcsc.co.kr")) { setError("gcsc.co.kr 이메일만 가입할 수 있어요"); return; }
    if (pw !== pw2) { setError("비밀번호가 일치하지 않아요"); return; }
    if (pw.length < 6) { setError("비밀번호는 6자 이상이어야 해요"); return; }
    setLoading(true); clear();
    const res = await api.register(name, email, pw, phone);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setMsg("가입 완료! 로그인해주세요 😊");
    setTab("login"); setName(""); setPw(""); setPw2(""); setPhone("");
  };

  const handleReset = async () => {
    if (!email) { setError("이메일을 입력해주세요"); return; }
    setLoading(true); clear();
    const res = await api.resetPassword(email);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setMsg(`임시 비밀번호: ${res.tempPassword}\n\n로그인 후 반드시 비밀번호를 변경해주세요!`);
  };

  const inp = (value, onChange, placeholder, type="text") => (
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",boxSizing:"border-box",fontSize:14,padding:"10px 14px",borderRadius:10,
        border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f",background:"#f9f9f9",marginBottom:10}}/>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f5f5f7",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system,'Inter',sans-serif",padding:16}}>
      <div style={{background:"#fff",borderRadius:18,padding:32,width:"100%",maxWidth:380,boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>

        {/* 로고 */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:22,fontWeight:700,color:"#1d1d1f",letterSpacing:"-0.5px"}}>업무 관리</div>
          <div style={{fontSize:12,color:"#7a7a7a",marginTop:4}}>GC 인사팀 전용</div>
        </div>

        {/* 탭 */}
        <div style={{display:"flex",background:"#f5f5f7",borderRadius:10,padding:3,marginBottom:22,gap:2}}>
          {[["login","로그인"],["register","회원가입"],["reset","비밀번호 초기화"]].map(([id,label])=>(
            <button key={id} onClick={()=>{setTab(id);clear();}}
              style={{flex:1,fontSize:12,padding:"7px 4px",borderRadius:8,border:"none",cursor:"pointer",
                background:tab===id?"#fff":"transparent",color:tab===id?"#1d1d1f":"#7a7a7a",
                fontWeight:tab===id?500:400,boxShadow:tab===id?"0 1px 4px rgba(0,0,0,0.08)":"none"}}>
              {label}
            </button>
          ))}
        </div>

        {/* 로그인 */}
        {tab==="login"&&(
          <div>
            {inp(email, setEmail, "이메일 (gcsc.co.kr)", "email")}
            {inp(pw, setPw, "비밀번호", "password")}
            <button onClick={handleLogin} disabled={loading}
              style={{width:"100%",background:"#0066cc",color:"#fff",border:"none",borderRadius:999,padding:"12px",fontSize:14,fontWeight:500,cursor:loading?"default":"pointer",opacity:loading?0.7:1}}>
              {loading ? "로그인 중…" : "로그인"}
            </button>
          </div>
        )}

        {/* 회원가입 */}
        {tab==="register"&&(
          <div>
            {inp(name, setName, "이름")}
            {inp(email, setEmail, "이메일 (gcsc.co.kr)", "email")}
            {inp(phone, setPhone, "휴대폰 번호 (선택)", "tel")}
            {inp(pw, setPw, "비밀번호 (6자 이상)", "password")}
            {inp(pw2, setPw2, "비밀번호 확인", "password")}
            <button onClick={handleRegister} disabled={loading}
              style={{width:"100%",background:"#0066cc",color:"#fff",border:"none",borderRadius:999,padding:"12px",fontSize:14,fontWeight:500,cursor:loading?"default":"pointer",opacity:loading?0.7:1}}>
              {loading ? "가입 중…" : "가입하기"}
            </button>
          </div>
        )}

        {/* 비밀번호 초기화 */}
        {tab==="reset"&&(
          <div>
            <p style={{fontSize:13,color:"#7a7a7a",marginBottom:14,lineHeight:1.6}}>
              가입한 이메일을 입력하면 임시 비밀번호를 발급해드려요. 로그인 후 반드시 비밀번호를 변경해주세요.
            </p>
            {inp(email, setEmail, "이메일 (gcsc.co.kr)", "email")}
            <button onClick={handleReset} disabled={loading}
              style={{width:"100%",background:"#1d1d1f",color:"#fff",border:"none",borderRadius:999,padding:"12px",fontSize:14,fontWeight:500,cursor:loading?"default":"pointer",opacity:loading?0.7:1}}>
              {loading ? "처리 중…" : "임시 비밀번호 발급"}
            </button>
          </div>
        )}

        {/* 에러/메시지 */}
        {error&&<div style={{marginTop:14,padding:"10px 14px",background:"#fdecea",borderRadius:10,fontSize:13,color:"#c0392b"}}>{error}</div>}
        {msg&&<div style={{marginTop:14,padding:"10px 14px",background:"#e6f4ea",borderRadius:10,fontSize:13,color:"#1a7f37",whiteSpace:"pre-line"}}>{msg}</div>}
      </div>
    </div>
  );
}