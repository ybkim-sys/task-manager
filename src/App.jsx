import { useState, useRef, useEffect } from "react";
import { api, session } from "./api.js";
import Login from "./Login.jsx";

const STATUSES = [
  { id:"todo",    label:"할 일",       bg:"#f5f5f7", color:"#555",    border:"#d0d0d5" },
  { id:"doing",   label:"진행 중",     bg:"#e8f1fb", color:"#0050a0", border:"#b5d0f0" },
  { id:"waiting", label:"회신 대기중", bg:"#fff3e0", color:"#bf5a00", border:"#ffcc80" },
  { id:"done",    label:"완료",        bg:"#e6f4ea", color:"#1a7f37", border:"#a8d5b5" },
  { id:"hold",    label:"보류",        bg:"#f3eeff", color:"#6835c9", border:"#c9b3f5" },
];

const INIT_CATS = ["급여 및 4대보험","임직원 관리","규정관리","인사평가","SW관리","교육·행사","정부지원금","복리후생","외부연계","기타"];

let nid = 100;
const today = new Date(); today.setHours(0,0,0,0);

function daysDiff(due) {
  if (!due) return null;
  const d = new Date(due); d.setHours(0,0,0,0);
  return Math.floor((d - today) / 86400000);
}
function urgency(t) {
  if (t.status==="done"||t.status==="hold") return 0;
  const d = daysDiff(t.due);
  if (d===null) return 1;
  if (d<0) return 5; if (d<=2) return 4; if (d<=3) return 3; if (d<=7) return 2;
  return 1;
}
function rowBg(t, isSel) {
  if (isSel) return { bg:"#deeaff", bl:"3px solid #0066cc" };
  const u = urgency(t);
  if (u===5) return { bg:"#fde8e8", bl:"3px solid #c0392b" };
  if (u===4) return { bg:"#fcd9d9", bl:"3px solid #e53935" };
  if (u===3) return { bg:"#ffe8cc", bl:"3px solid #e67e22" };
  if (u===2) return { bg:"#fff8ee", bl:"3px solid #f5a623" };
  return { bg:"#fff", bl:"3px solid transparent" };
}

function DueBadge({ due, status }) {
  if (!due||status==="done"||status==="hold") return <span style={{fontSize:11,color:"#bbb"}}>—</span>;
  const d = daysDiff(due);
  let color="#7a7a7a", bg="transparent", fw=400;
  if (d<0)       { color="#fff";    bg="#c0392b"; fw=600; }
  else if (d<=2) { color="#c0392b"; bg="#fdecea"; fw=600; }
  else if (d<=3) { color="#bf5a00"; bg="#fff0e0"; fw=600; }
  else if (d<=7) { color="#bf5a00"; bg="#fff3e0"; fw=500; }
  const label = d<0?`D+${Math.abs(d)}`:d===0?"오늘":`D-${d}`;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:3}}>
      <span style={{fontSize:11,color,background:bg,borderRadius:5,padding:bg!=="transparent"?"1px 5px":"0",fontWeight:fw}}>{label}</span>
      <span style={{fontSize:11,color:"#aaa"}}>{due.slice(5)}</span>
    </span>
  );
}
function Stars({ v, onChange }) {
  return <span>{[1,2,3,4,5].map(i=>(
    <span key={i} onClick={()=>onChange&&onChange(i)} style={{fontSize:12,color:i<=v?"#f5a623":"#ddd",cursor:onChange?"pointer":"default"}}>★</span>
  ))}</span>;
}
function StatusBadge({ s }) {
  const st = STATUSES.find(x=>x.id===s)||STATUSES[0];
  return <span style={{fontSize:10,fontWeight:500,padding:"2px 6px",borderRadius:999,background:st.bg,color:st.color,border:`1px solid ${st.border}`,whiteSpace:"nowrap"}}>{st.label}</span>;
}
function Pill({ label, active, onClick, accent }) {
  return (
    <button onClick={onClick} style={{fontSize:11,padding:"4px 10px",borderRadius:999,cursor:"pointer",
      background:active?(accent||"#0066cc"):"#f5f5f7",color:active?"#fff":"#555",
      border:active?"none":"0.5px solid #e0e0e0",fontWeight:active?500:400,whiteSpace:"nowrap"}}>
      {label}
    </button>
  );
}

function TaskCard({ t, isSel, onClick }) {
  const {bg, bl} = rowBg(t, isSel);
  return (
    <div onClick={onClick} style={{background:bg,borderLeft:bl,borderRadius:12,padding:"12px 14px",marginBottom:8,cursor:"pointer",transition:"background 0.15s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
        <span style={{fontSize:14,fontWeight:t.status==="done"?400:600,color:t.status==="done"?"#aaa":"#1d1d1f",textDecoration:t.status==="done"?"line-through":"none",flex:1,marginRight:8,lineHeight:1.4}}>{t.title}</span>
        <DueBadge due={t.due} status={t.status}/>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
        {t.cat&&<span style={{fontSize:11,color:"#7a7a7a",background:"#f0f0f0",borderRadius:5,padding:"1px 6px"}}>{t.cat}</span>}
        <StatusBadge s={t.status}/>
        <Stars v={t.stars}/>
        {t.waiting_for&&<span style={{fontSize:10,color:"#bf5a00",background:"#fff3e0",padding:"1px 5px",borderRadius:4}}>⏳{t.waiting_for}</span>}
        {t.memo&&<span style={{fontSize:10,color:"#aaa"}}>📝</span>}
        {(t.checklist||[]).length>0&&<span style={{fontSize:10,color:"#aaa"}}>[{(t.checklist||[]).filter(x=>x.done).length}/{(t.checklist||[]).length}]</span>}
        {t.archived&&<span style={{fontSize:10,color:"#1a7f37"}}>📦</span>}
      </div>
    </div>
  );
}

export default function App() {
  const [user,            setUser]            = useState(null);
  const [authChecked,     setAuthChecked]     = useState(false);
  const [mobile,          setMobile]          = useState(window.innerWidth < 768);
  const [subtitle,        setSubtitle]        = useState("");
  const [editingSubtitle, setEditingSubtitle] = useState(false);
  const [subtitleDraft,   setSubtitleDraft]   = useState("");
  const [tasks,           setTasks]           = useState([]);
  const [order,           setOrder]           = useState([]);
  const [sel,             setSel]             = useState(null);
  const [filterStatus,    setFS]              = useState("todo");
  const [filterCat,       setFC]              = useState("전체");
  const [sortBy,          setSB]              = useState("urgency");
  const [catSort,         setCatSort]         = useState("none");
  const [titleSort,       setTitleSort]       = useState("none");
  const [cats,            setCats]            = useState(INIT_CATS);
  const [catEditIdx,      setCatEditIdx]      = useState(null);
  const [catEditVal,      setCatEditVal]      = useState("");
  const [newCatName,      setNewCatName]      = useState("");
  const [modal,           setModal]           = useState(null);
  const [cleanupDays,     setCD]              = useState(30);
  const [archSearch,      setAS]              = useState("");
  const [newT,            setNewT]            = useState({title:"",due:"",stars:3,status:"todo",memo:"",waiting_for:"",cat:"기타"});

  const [memos,        setMemos]        = useState([]);
  const [memoInput,    setMemoInput]    = useState("");
  const [memoOpen,     setMemoOpen]     = useState(false);
  const dragId   = useRef(null);
  const dragOver = useRef(null);
  const cDragId  = useRef(null);
  const cDragOver= useRef(null);

  useEffect(()=>{
    if (session.get()) {
      api.me().then(res => {
        if (res.id) { setUser(res); setSubtitle(res.subtitle||""); }
        else session.clear();
        setAuthChecked(true);
      });
    } else {
      setAuthChecked(true);
    }
  },[]);

  useEffect(()=>{
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  },[]);

  useEffect(()=>{
    if (!user) return;
    api.getTasks().then(data=>{
      if(Array.isArray(data)){
        setTasks(data.map(t=>({...t,checklist:t.checklist?JSON.parse(t.checklist):[],archived:!!t.archived})));
        setOrder(data.map(t=>t.id));
      }
    });
    });api.getCategories().then(data=>{
      if(Array.isArray(data)&&data.length>0) setCats(data.map(c=>c.name));
    });
    api.getMemos().then(data=>{ if(Array.isArray(data)) setMemos(data); });  // ← 여기 추가
  },[user]);

  if (!authChecked) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"-apple-system,sans-serif",color:"#7a7a7a"}}>로딩 중…</div>
  );
  if (!user) return <Login onLogin={u=>{ setUser(u); setSubtitle(u.subtitle||""); }}/>;

  const handleLogout = async () => { await api.logout(); session.clear(); setUser(null); };
  const saveSubtitle = async (val) => {
    setSubtitle(val); setEditingSubtitle(false);
    await api.saveSubtitle(val);
  };

  // ── filtered ──
  const filtered = (()=>{
    let base = sortBy==="manual" ? order.map(id=>tasks.find(t=>t.id===id)).filter(Boolean) : [...tasks];
    if (filterStatus==="todo") base=base.filter(x=>x.status!=="done");
    else if (filterStatus==="done") base=base.filter(x=>x.status==="done");
    else if (filterStatus!=="전체") base=base.filter(x=>x.status===filterStatus);
    if (filterCat!=="전체") base=base.filter(x=>x.cat===filterCat);
    if (sortBy==="urgency") base=[...base].sort((a,b)=>urgency(b)-urgency(a)||(a.due||"z").localeCompare(b.due||"z"));
    else if (sortBy==="stars") base=[...base].sort((a,b)=>b.stars-a.stars);
    else if (sortBy==="due")   base=[...base].sort((a,b)=>(a.due||"z").localeCompare(b.due||"z"));
    // 카테고리/업무 오름차순 내림차순 (긴급순 등 다른 정렬 선택시 비활성)
    if (catSort!=="none") {
      base=[...base].sort((a,b)=>{
        const catA=(a.cat||"기타"), catB=(b.cat||"기타");
        const catCmp = catA.localeCompare(catB,"ko");
        if (catCmp!==0) return catSort==="asc" ? catCmp : -catCmp;
        if (titleSort==="none") return 0;
        const titleCmp = (a.title||"").localeCompare(b.title||"","ko");
        return titleSort==="asc" ? titleCmp : -titleCmp;
      });
    }
    return base;
  })();

  const selTask = sel ? tasks.find(t=>t.id===sel) : null;

  const archives = (()=>{
    const q=archSearch.toLowerCase();
    return tasks.filter(t=>t.archived)
      .filter(t=>!q||t.title.includes(q)||(t.memo||"").includes(q)||(t.guide||"").includes(q))
      .sort((a,b)=>(b.completedAt||"").localeCompare(a.completedAt||""));
  })();

  const cleanupTargets = (()=>{
    const cut=new Date(); cut.setDate(cut.getDate()-cleanupDays);
    return tasks.filter(t=>t.status==="done"&&!t.archived&&t.due&&new Date(t.due)<=cut);
  })();

  const urgCounts = {
    overdue: tasks.filter(t=>t.status!=="done"&&t.status!=="hold"&&daysDiff(t.due)<0).length,
    soon:    tasks.filter(t=>t.status!=="done"&&t.status!=="hold"&&(d=>d!==null&&d>=0&&d<=3)(daysDiff(t.due))).length,
    waiting: tasks.filter(t=>t.status==="waiting").length,
  };

  // ── task actions ──
  const upd = (id, patch) => {
    setTasks(p => p.map(t => t.id===id ? {...t,...patch} : t));
    const task = tasks.find(t=>t.id===id);
    if (task) {
      const updated = {...task,...patch};
      api.updateTask(id, {...updated, checklist:JSON.stringify(updated.checklist||[]), archived:updated.archived?1:0});
    }
  };
  const del = id => { setTasks(p=>p.filter(t=>t.id!==id)); setOrder(p=>p.filter(x=>x!==id)); if(sel===id)setSel(null); api.deleteTask(id); };
  const archiveTask = id => { upd(id,{status:"done",archived:true,completedAt:new Date().toISOString().slice(0,10)}); setSel(null); };
  const addTask = () => {
    if (!newT.title.trim()) return;
    api.addTask({...newT, guide:"", checklist:"[]", archived:0}).then(res=>{
      if(res.id){ const t={...newT, id:res.id, guide:"", checklist:[], archived:false}; setTasks(p=>[...p,t]); setOrder(p=>[...p,res.id]); }
    });
    setNewT({title:"",due:"",stars:3,status:"todo",memo:"",waiting_for:"",cat:"기타"}); setModal(null);
  };

  // ── drag ──
  const onDS=(e,id)=>{ dragId.current=id; e.dataTransfer.effectAllowed="move"; };
  const onDE=(_e,id)=>{ dragOver.current=id; };
  const onDEnd=()=>{
    const from=dragId.current, to=dragOver.current;
    if(!from||!to||from===to){dragId.current=dragOver.current=null;return;}
    const ids=filtered.map(t=>t.id); const fi=ids.indexOf(from), ti=ids.indexOf(to);
    if(fi<0||ti<0){dragId.current=dragOver.current=null;return;}
    ids.splice(fi,1); ids.splice(ti,0,from); setOrder(ids); setSB("manual");
    dragId.current=dragOver.current=null;
  };

  // ── category actions (DB 연동) ──
  const catStartEdit = i => { setCatEditIdx(i); setCatEditVal(cats[i]); };
  const catSaveEdit  = i => {
    const v = catEditVal.trim(); if(!v){setCatEditIdx(null);return;}
    const old = cats[i];
    setCats(p => p.map((c,j) => j===i ? v : c));
    setTasks(p => p.map(t => t.cat===old ? {...t,cat:v} : t));
    setCatEditIdx(null);
    api.getCategories().then(data=>{
      const cat = data.find(c=>c.name===old);  // 수정 전 이름으로 찾기
      if(cat) api.updateCategory(cat.id, v);
      else {
        // id를 못 찾으면 sort_order로 매칭
        const byOrder = data[i];
        if(byOrder) api.updateCategory(byOrder.id, v);
      }
    });
  };
  const catRemove = i => {
    if(tasks.filter(t=>t.cat===cats[i]).length>0) return;
    api.getCategories().then(data=>{
      const cat = data.find(c=>c.name===cats[i]);
      if(cat) api.deleteCategory(cat.id);
    });
    setCats(p=>p.filter((_,j)=>j!==i));
  };
  const catAdd = () => {
    const v=newCatName.trim(); if(!v||cats.includes(v)) return;
    setCats(p=>[...p,v]);
    api.addCategory(v);
    setNewCatName("");
  };

  // 체크리스트 변경 시 즉시 DB 저장
  const updChecklist = (id, checklist) => {
    setTasks(p => p.map(t => t.id===id ? {...t, checklist} : t));
    const task = tasks.find(t=>t.id===id);
    if (task) {
      const updated = {...task, checklist};
      api.updateTask(id, {...updated, checklist:JSON.stringify(checklist), archived:updated.archived?1:0});
    }
  };

  const closeModal = () => { setModal(null); setCatEditIdx(null); };

  const addMemo = () => {
    if (!memoInput.trim()) return;
    api.addMemo(memoInput.trim()).then(res=>{
      if(res.id) setMemos(p=>[{id:res.id, content:memoInput.trim(), created_at:new Date().toLocaleString("ko-KR")}, ...p]);
    });
    setMemoInput(""); setMemoOpen(false);
  };
  const deleteMemo = id => { api.deleteMemo(id); setMemos(p=>p.filter(m=>m.id!==id)); };
  return (
    <div style={{fontFamily:"-apple-system,'Inter',sans-serif",color:"#1d1d1f",height:"100vh",display:"flex",flexDirection:"column",background:"#f5f5f7",overflow:"hidden"}}>

      {/* Header */}
      <div style={{background:"#fff",borderBottom:"0.5px solid #e0e0e0",padding:mobile?"8px 12px":"10px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:100}}>
          <span style={{fontSize:mobile?14:16,fontWeight:600,letterSpacing:"-0.3px"}}>GC 업무관리툴(MADE BY YBKIM) <span style={{fontSize:10,color:"#aaa",fontWeight:400}}>made by ybkim</span></span>
          {!mobile&&(
            editingSubtitle
              ? <input autoFocus value={subtitleDraft} onChange={e=>setSubtitleDraft(e.target.value)}
                  onBlur={()=>saveSubtitle(subtitleDraft)}
                  onKeyDown={e=>{ if(e.key==="Enter")saveSubtitle(subtitleDraft); if(e.key==="Escape")setEditingSubtitle(false); }}
                  style={{fontSize:11,color:"#1d1d1f",marginLeft:10,border:"0.5px solid #0066cc",borderRadius:6,padding:"2px 8px",outline:"none",width:280}}/>
              : <span onClick={()=>{setSubtitleDraft(subtitle);setEditingSubtitle(true);}} title="클릭하여 수정"
                  style={{fontSize:11,color:"#7a7a7a",marginLeft:10,cursor:"pointer"}}>
                  {subtitle||"지씨 여러분 화이팅입니다~😍💕😘👌👍😁😂🤣"} ✏️
                </span>
          )}
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
          {urgCounts.overdue>0&&<span style={{fontSize:11,background:"#c0392b",color:"#fff",borderRadius:999,padding:"2px 7px",fontWeight:600}}>D+ {urgCounts.overdue}</span>}
          {urgCounts.soon>0&&<span style={{fontSize:11,background:"#fcd9d9",color:"#c0392b",borderRadius:999,padding:"2px 7px",fontWeight:600}}>D-3내 {urgCounts.soon}</span>}
          {urgCounts.waiting>0&&<span style={{fontSize:11,background:"#fff3e0",color:"#bf5a00",borderRadius:999,padding:"2px 7px"}}>대기 {urgCounts.waiting}</span>}
        </div>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          <span style={{fontSize:12,color:"#7a7a7a"}}>{user.name}</span>
          <button onClick={handleLogout} style={{fontSize:11,background:"#f5f5f7",color:"#555",border:"0.5px solid #e0e0e0",borderRadius:999,padding:"4px 10px",cursor:"pointer"}}>로그아웃</button>
          <button onClick={()=>setModal("add")} style={{fontSize:12,background:"#0066cc",color:"#fff",border:"none",borderRadius:999,padding:"5px 12px",cursor:"pointer",fontWeight:500}}>+ 추가</button>
          {!mobile&&<>
            <button onClick={()=>setModal("archive")} style={{fontSize:11,background:"#f5f5f7",color:"#555",border:"0.5px solid #e0e0e0",borderRadius:999,padding:"5px 10px",cursor:"pointer"}}>🗄 보관함</button>
            <button onClick={()=>setModal("cats")}    style={{fontSize:11,background:"#f5f5f7",color:"#555",border:"0.5px solid #e0e0e0",borderRadius:999,padding:"5px 10px",cursor:"pointer"}}>📂 카테고리</button>
            <button onClick={()=>setModal("cleanup")} style={{fontSize:11,background:"#f5f5f7",color:"#7a7a7a",border:"0.5px solid #e0e0e0",borderRadius:999,padding:"5px 10px",cursor:"pointer"}}>🗑 정리</button>
          </>}
          {mobile&&<button onClick={()=>setModal("menu")} style={{fontSize:16,background:"#f5f5f7",border:"0.5px solid #e0e0e0",borderRadius:999,padding:"4px 10px",cursor:"pointer"}}>☰</button>}
        </div>
      </div>

      {/* Filters */}
      <div style={{background:"#fff",borderBottom:"0.5px solid #e0e0e0",padding:mobile?"6px 12px":"6px 16px",display:"flex",gap:5,alignItems:"center",overflowX:"auto",flexShrink:0}}>
        <Pill label="TO DO"    active={filterStatus==="todo"}    onClick={()=>setFS("todo")}/>
        <Pill label="완료"     active={filterStatus==="done"}    onClick={()=>setFS("done")} accent="#1a7f37"/>
        <Pill label="전체"     active={filterStatus==="전체"}    onClick={()=>setFS("전체")}/>
        {!mobile&&<>
          <span style={{width:1,height:14,background:"#e0e0e0",margin:"0 2px",flexShrink:0}}/>
          <Pill label="긴급순" active={sortBy==="urgency"&&catSort==="none"} onClick={()=>{setSB("urgency");setCatSort("none");setTitleSort("none");}}/>
          <Pill label="별점순" active={sortBy==="stars"&&catSort==="none"}   onClick={()=>{setSB("stars");setCatSort("none");setTitleSort("none");}}/>
          <Pill label="기한순" active={sortBy==="due"&&catSort==="none"}     onClick={()=>{setSB("due");setCatSort("none");setTitleSort("none");}}/>
          {sortBy==="manual"&&catSort==="none"&&<Pill label="직접정렬 중" active={true} onClick={()=>{}} accent="#6835c9"/>}
        </>}
        <span style={{width:1,height:14,background:"#e0e0e0",margin:"0 2px",flexShrink:0}}/>
        <select value={filterCat} onChange={e=>setFC(e.target.value)}
          style={{fontSize:11,padding:"3px 8px",borderRadius:8,border:"0.5px solid #e0e0e0",background:"#f5f5f7",color:"#555",flexShrink:0}}>
          <option>전체</option>
          {cats.map(c=><option key={c}>{c}</option>)}
        </select>
        <span style={{marginLeft:"auto",fontSize:11,color:"#aaa",flexShrink:0}}>{filtered.length}건</span>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        <div style={{flex:1,overflowY:"auto",padding:mobile?"8px":"10px 12px"}}>
          {mobile&&(
            <div>{filtered.map(t=><TaskCard key={t.id} t={t} isSel={sel===t.id} onClick={()=>setSel(sel===t.id?null:t.id)}/>)}</div>
          )}
          {!mobile&&(
            <table style={{width:"100%",borderCollapse:"separate",borderSpacing:"0 4px"}}>
              <thead>
                <tr style={{fontSize:11,color:"#aaa"}}>
                  {sortBy==="manual"&&<th style={{width:20,fontWeight:400}}/>}
                  <th onClick={()=>{setCatSort(p=>p==="none"||p==="desc"?"asc":"desc");setSB("cat");}} style={{textAlign:"center",padding:"0 8px",fontWeight:400,width:120,cursor:"pointer",userSelect:"none"}}>
                    카테고리 {catSort==="asc"?"↑":catSort==="desc"?"↓":"↕"}
                  </th>
                  <th onClick={()=>{setTitleSort(p=>p==="none"||p==="desc"?"asc":"desc");if(catSort==="none")setCatSort("asc");}} style={{textAlign:"left",padding:"0 8px",fontWeight:400,cursor:"pointer",userSelect:"none"}}>
                    업무 {titleSort==="asc"?"↑":titleSort==="desc"?"↓":"↕"}
                  </th>
                  <th style={{textAlign:"center",padding:"0 4px",fontWeight:400,width:35}}>중요도</th>
                  <th style={{textAlign:"center",padding:"0 4px",fontWeight:400,width:45}}>상태</th>
                  <th style={{textAlign:"center",padding:"0 4px",fontWeight:400,width:45}}>기한</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t=>{
                  const isSel=sel===t.id; const {bg,bl}=rowBg(t,isSel);
                  return (
                    <tr key={t.id} draggable onDragStart={e=>onDS(e,t.id)} onDragEnter={e=>onDE(e,t.id)} onDragEnd={onDEnd} onDragOver={e=>e.preventDefault()}
                      onClick={()=>setSel(isSel?null:t.id)}
                      style={{cursor:"pointer",background:bg,borderLeft:bl,borderRadius:10,transition:"background 0.15s",userSelect:"none"}}>
                      {sortBy==="manual"&&<td style={{padding:"8px 4px 8px 8px",borderRadius:"10px 0 0 10px",color:"#ccc",fontSize:13,cursor:"grab"}}>☰</td>}
                      <td style={{padding:"8px",borderRadius:sortBy==="manual"?"0":"10px 0 0 10px",fontSize:12,color:"#7a7a7a",textAlign:"center",whiteSpace:"nowrap",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis"}}>{t.cat||"기타"}</td>
                      <td style={{padding:"8px",fontSize:13,fontWeight:t.status==="done"?400:500,color:t.status==="done"?"#aaa":"#1d1d1f",textDecoration:t.status==="done"?"line-through":"none",textAlign:"left"}}>
                        <div>{t.title}
                        {t.waiting_for&&<span style={{fontSize:10,color:"#bf5a00",marginLeft:6,background:"#fff3e0",padding:"1px 5px",borderRadius:4}}>⏳{t.waiting_for}</span>}
                        {(t.checklist||[]).length>0&&<span style={{fontSize:10,color:"#aaa",marginLeft:4}}>[{(t.checklist||[]).filter(x=>x.done).length}/{(t.checklist||[]).length}]</span>}
                        {t.archived&&<span style={{fontSize:10,color:"#1a7f37",marginLeft:4}}>📦</span>}
                        </div>
                        {t.memo&&<div style={{fontSize:11,color:"#aaa",marginTop:1,textAlign:"left"}}>{t.memo.length>20?t.memo.slice(0,20)+"…":t.memo}</div>}
                      </td>
                      <td style={{padding:"8px",textAlign:"center"}}><Stars v={t.stars}/></td>
                      <td style={{padding:"8px 4px",textAlign:"center"}}><StatusBadge s={t.status}/></td>
                      <td style={{padding:"8px",textAlign:"center",borderRadius:"0 10px 10px 0"}}><DueBadge due={t.due} status={t.status}/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Side panel PC */}
        {selTask&&!mobile&&(
          <div style={{width:380,background:"#fff",borderLeft:"0.5px solid #e0e0e0",padding:16,overflowY:"auto",flexShrink:0,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <span style={{fontSize:13,fontWeight:600,color:"#1d1d1f",lineHeight:1.4,flex:1}}>{selTask.title}</span>
              <button onClick={()=>setSel(null)} style={{fontSize:18,background:"none",border:"none",color:"#aaa",cursor:"pointer",padding:0,marginLeft:8}}>×</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                ["제목",     <input value={selTask.title} onChange={e=>upd(selTask.id,{title:e.target.value})} style={{fontSize:13,padding:"4px 8px",borderRadius:7,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%",fontWeight:500}}/>],
                ["카테고리", <select value={selTask.cat||"기타"} onChange={e=>upd(selTask.id,{cat:e.target.value})} style={{fontSize:12,padding:"4px 8px",borderRadius:7,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%"}}>{cats.map(c=><option key={c}>{c}</option>)}</select>],
                ["상태",     <select value={selTask.status} onChange={e=>upd(selTask.id,{status:e.target.value})} style={{fontSize:12,padding:"4px 8px",borderRadius:7,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%"}}>{STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>],
                ["기한", <div style={{display:"flex",alignItems:"center",gap:6}}>   <input type="date" value={selTask.due||""} disabled={!selTask.due} onChange={e=>upd(selTask.id,{due:e.target.value})} style={{flex:1,fontSize:12,padding:"4px 8px",borderRadius:7,border:"0.5px solid #e0e0e0",background:!selTask.due?"#f5f5f7":"#f9f9f9",color:"#1d1d1f"}}/>   <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#7a7a7a",whiteSpace:"nowrap",cursor:"pointer"}}>     <input type="checkbox" checked={!selTask.due} onChange={e=>upd(selTask.id,{due:e.target.checked?"":new Date().toISOString().slice(0,10)})} style={{accentColor:"#0066cc"}}/>기한없음   </label> </div>],
                ["중요도",   <Stars v={selTask.stars} onChange={v=>upd(selTask.id,{stars:v})}/>],
              ].map(([label,el])=>(<div key={label}><div style={{fontSize:10,color:"#aaa",marginBottom:3}}>{label}</div>{el}</div>))}
              {selTask.status==="waiting"&&(<div><div style={{fontSize:10,color:"#bf5a00",marginBottom:3}}>회신 대기 담당자</div><input value={selTask.waiting_for||""} placeholder="누구의 회신을 기다리나요?" onChange={e=>upd(selTask.id,{waiting_for:e.target.value})} style={{fontSize:12,padding:"4px 8px",borderRadius:7,border:"1px solid #ffcc80",background:"#fff9f0",color:"#1d1d1f",width:"100%",boxSizing:"border-box"}}/></div>)}
              <div><div style={{fontSize:10,color:"#aaa",marginBottom:3}}>메모</div><textarea value={selTask.memo||""} rows={2} placeholder="참고사항" onChange={e=>upd(selTask.id,{memo:e.target.value})} style={{fontSize:12,padding:"4px 8px",borderRadius:7,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"}}/></div>
            </div>
            <div style={{borderTop:"0.5px solid #f0f0f0",paddingTop:12}}>
              <div style={{fontSize:11,fontWeight:500,color:"#1d1d1f",marginBottom:6}}>처리 방법</div>
              <textarea value={selTask.guide||""} rows={14} placeholder={"처리 절차, 참고사항\n\n예)\n1. 홈택스 로그인\n2. 전자신고 → 원천세 선택"} onChange={e=>upd(selTask.id,{guide:e.target.value})} style={{fontSize:12,padding:"8px 10px",borderRadius:7,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",lineHeight:1.7}}/>
            </div>
            <div style={{borderTop:"0.5px solid #f0f0f0",paddingTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:11,fontWeight:500,color:"#1d1d1f"}}>세부 체크리스트</div>
                <button onClick={()=>updChecklist(selTask.id,[...(selTask.checklist||[]),{id:Date.now(),text:"",done:false}])} style={{fontSize:11,color:"#0066cc",background:"none",border:"none",cursor:"pointer",padding:0}}>+ 추가</button>
              </div>
              {(selTask.checklist||[]).length===0?<div style={{fontSize:11,color:"#bbb"}}>세부 단계를 추가해보세요</div>
                :(selTask.checklist||[]).map((item,i)=>(
                <div key={item.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                  <input type="checkbox" checked={item.done} onChange={e=>{const cl=[...(selTask.checklist||[])];cl[i]={...cl[i],done:e.target.checked};updChecklist(selTask.id,cl);}} style={{accentColor:"#0066cc",flexShrink:0}}/>
                  <input value={item.text} placeholder="세부 항목" onChange={e=>{const cl=[...(selTask.checklist||[])];cl[i]={...cl[i],text:e.target.value};updChecklist(selTask.id,cl);}} style={{flex:1,fontSize:12,padding:"3px 6px",borderRadius:6,border:"0.5px solid #e0e0e0",background:item.done?"#f5f5f7":"#fff",color:item.done?"#aaa":"#1d1d1f",textDecoration:item.done?"line-through":"none",outline:"none"}}/>
                  <button onClick={()=>updChecklist(selTask.id,(selTask.checklist||[]).filter((_,j)=>j!==i))} style={{fontSize:14,color:"#ccc",background:"none",border:"none",cursor:"pointer",padding:0}}>×</button>
                </div>))}
              {(selTask.checklist||[]).length>0&&<div style={{fontSize:10,color:"#aaa",marginTop:4}}>{(selTask.checklist||[]).filter(x=>x.done).length}/{(selTask.checklist||[]).length} 완료</div>}
            </div>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              {!selTask.archived?<button onClick={()=>archiveTask(selTask.id)} style={{flex:1,fontSize:12,color:"#1a7f37",background:"#f0faf3",border:"0.5px solid #a8d5b5",borderRadius:8,padding:"7px",cursor:"pointer",fontWeight:500}}>✓ 완료 &amp; 보관</button>
                :<div style={{flex:1,fontSize:11,color:"#1a7f37",background:"#f0faf3",border:"0.5px solid #a8d5b5",borderRadius:8,padding:"7px",textAlign:"center"}}>📦 보관됨 · {selTask.completedAt}</div>}
              <button onClick={()=>del(selTask.id)} style={{fontSize:12,color:"#c0392b",background:"none",border:"0.5px solid #f5c6c6",borderRadius:8,padding:"7px 14px",cursor:"pointer"}}>삭제</button>
            </div>
          </div>
        )}

        {/* 모바일 하단 패널 */}
        {selTask&&mobile&&(
          <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderRadius:"16px 16px 0 0",padding:20,maxHeight:"80vh",overflowY:"auto",boxShadow:"0 -4px 24px rgba(0,0,0,0.12)",zIndex:50}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <span style={{fontSize:15,fontWeight:600,color:"#1d1d1f",flex:1,lineHeight:1.4}}>{selTask.title}</span>
              <button onClick={()=>setSel(null)} style={{fontSize:20,background:"none",border:"none",color:"#aaa",cursor:"pointer",padding:0,marginLeft:8}}>×</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[
                ["제목",     <input value={selTask.title} onChange={e=>upd(selTask.id,{title:e.target.value})} style={{fontSize:14,padding:"6px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%",fontWeight:500}}/>],
                ["카테고리", <select value={selTask.cat||"기타"} onChange={e=>upd(selTask.id,{cat:e.target.value})} style={{fontSize:13,padding:"6px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%"}}>{cats.map(c=><option key={c}>{c}</option>)}</select>],
                ["상태",     <select value={selTask.status} onChange={e=>upd(selTask.id,{status:e.target.value})} style={{fontSize:13,padding:"6px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%"}}>{STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>],
                ["기한",     <input type="date" value={selTask.due||""} onChange={e=>upd(selTask.id,{due:e.target.value})} style={{fontSize:13,padding:"6px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%"}}/>],
                ["중요도",   <Stars v={selTask.stars} onChange={v=>upd(selTask.id,{stars:v})}/>],
              ].map(([label,el])=>(<div key={label}><div style={{fontSize:11,color:"#aaa",marginBottom:3}}>{label}</div>{el}</div>))}
              {selTask.status==="waiting"&&(<div><div style={{fontSize:11,color:"#bf5a00",marginBottom:3}}>회신 대기 담당자</div><input value={selTask.waiting_for||""} placeholder="누구의 회신을 기다리나요?" onChange={e=>upd(selTask.id,{waiting_for:e.target.value})} style={{fontSize:13,padding:"6px 10px",borderRadius:8,border:"1px solid #ffcc80",background:"#fff9f0",color:"#1d1d1f",width:"100%",boxSizing:"border-box"}}/></div>)}
              <div><div style={{fontSize:11,color:"#aaa",marginBottom:3}}>메모</div><textarea value={selTask.memo||""} rows={2} onChange={e=>upd(selTask.id,{memo:e.target.value})} style={{fontSize:13,padding:"6px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%",boxSizing:"border-box",resize:"none",fontFamily:"inherit"}}/></div>
              <div><div style={{fontSize:11,color:"#aaa",marginBottom:3}}>처리 방법</div><textarea value={selTask.guide||""} rows={5} onChange={e=>upd(selTask.id,{guide:e.target.value})} style={{fontSize:13,padding:"6px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%",boxSizing:"border-box",resize:"none",fontFamily:"inherit",lineHeight:1.6}}/></div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:14}}>
              {!selTask.archived?<button onClick={()=>archiveTask(selTask.id)} style={{flex:1,fontSize:13,color:"#1a7f37",background:"#f0faf3",border:"0.5px solid #a8d5b5",borderRadius:10,padding:"10px",cursor:"pointer",fontWeight:500}}>✓ 완료 &amp; 보관</button>
                :<div style={{flex:1,fontSize:12,color:"#1a7f37",background:"#f0faf3",border:"0.5px solid #a8d5b5",borderRadius:10,padding:"10px",textAlign:"center"}}>📦 보관됨</div>}
              <button onClick={()=>del(selTask.id)} style={{fontSize:13,color:"#c0392b",background:"none",border:"0.5px solid #f5c6c6",borderRadius:10,padding:"10px 16px",cursor:"pointer"}}>삭제</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* 하단 메모 */}
      <div style={{background:"#fff",borderTop:"0.5px solid #e0e0e0",flexShrink:0}}>
        {memos.length>0&&(
          <div style={{maxHeight:160,overflowY:"auto",padding:"8px 16px",display:"flex",flexDirection:"column",gap:6}}>
            {memos.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 10px",background:"#fffde7",borderRadius:8,border:"0.5px solid #fff176"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:"#1d1d1f",lineHeight:1.5}}>{m.content}</div>
                  <div style={{fontSize:10,color:"#aaa",marginTop:1}}>{m.created_at}</div>
                </div>
                <button onClick={()=>deleteMemo(m.id)} style={{fontSize:14,color:"#ccc",background:"none",border:"none",cursor:"pointer",padding:0,flexShrink:0}}>×</button>
              </div>
            ))}
          </div>
        )}
        {memoOpen&&(
          <div style={{padding:"8px 16px",display:"flex",gap:8,borderTop:"0.5px solid #f0f0f0"}}>
            <textarea autoFocus value={memoInput} onChange={e=>setMemoInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addMemo();} }}
              placeholder="메모 내용 입력 후 Enter (줄바꿈은 Shift+Enter)"
              rows={2}
              style={{flex:1,fontSize:13,padding:"8px 10px",borderRadius:10,border:"0.5px solid #e0e0e0",resize:"none",fontFamily:"inherit",outline:"none",color:"#1d1d1f"}}/>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <button onClick={addMemo} style={{fontSize:12,background:"#0066cc",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontWeight:500}}>저장</button>
              <button onClick={()=>{setMemoOpen(false);setMemoInput("");}} style={{fontSize:12,background:"#f5f5f7",color:"#555",border:"0.5px solid #e0e0e0",borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>취소</button>
            </div>
          </div>
        )}
        <div style={{padding:"6px 16px"}}>
          <button onClick={()=>setMemoOpen(p=>!p)} style={{fontSize:12,color:"#0066cc",background:"none",border:"none",cursor:"pointer",padding:"4px 0",fontWeight:500}}>
            {memoOpen ? "✕ 닫기" : "+ 메모하기"}
          </button>
        </div>
      </div>
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:mobile?"flex-end":"center",justifyContent:"center",zIndex:100}}
          onClick={e=>{if(e.target===e.currentTarget)closeModal();}}>

          {modal==="menu"&&(
            <div style={{background:"#fff",borderRadius:"16px 16px 0 0",padding:20,width:"100%",display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>메뉴</div>
              {[["🗄 보관함","archive"],["📂 카테고리","cats"],["🗑 완료 정리","cleanup"],["긴급순","urgency"],["별점순","stars"],["기한순","due"]].map(([label,val])=>(
                <button key={val} onClick={()=>{ if(["archive","cats","cleanup"].includes(val)){setModal(val);}else{setSB(val);closeModal();} }}
                  style={{fontSize:14,padding:"12px 16px",borderRadius:10,border:"0.5px solid #e0e0e0",background:sortBy===val?"#e8f1fb":"#fafafa",color:sortBy===val?"#0066cc":"#1d1d1f",textAlign:"left",cursor:"pointer"}}>
                  {label}
                </button>
              ))}
              <button onClick={closeModal} style={{fontSize:14,padding:"12px",borderRadius:10,border:"none",background:"#f5f5f7",color:"#555",cursor:"pointer",marginTop:4}}>닫기</button>
            </div>
          )}

          {modal==="add"&&(
            <div style={{background:"#fff",borderRadius:mobile?"16px 16px 0 0":18,padding:24,width:mobile?"100%":"360px",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:16,fontWeight:600}}>새 업무 추가</div>
              <input placeholder="업무 제목" value={newT.title} onChange={e=>setNewT(p=>({...p,title:e.target.value}))} style={{fontSize:13,padding:"10px 12px",borderRadius:10,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f"}}/>
              <div style={{display:"flex",gap:8}}>
                <select value={newT.cat} onChange={e=>setNewT(p=>({...p,cat:e.target.value}))} style={{flex:1,fontSize:12,padding:"8px 10px",borderRadius:10,border:"0.5px solid #e0e0e0",background:"#fff",color:"#1d1d1f"}}>
                  {cats.map(c=><option key={c}>{c}</option>)}
                </select>
                <select value={newT.status} onChange={e=>setNewT(p=>({...p,status:e.target.value}))} style={{flex:1,fontSize:12,padding:"8px 10px",borderRadius:10,border:"0.5px solid #e0e0e0",background:"#fff",color:"#1d1d1f"}}>{STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
  <input type="date" value={newT.due} disabled={newT.nodue} onChange={e=>setNewT(p=>({...p,due:e.target.value}))} style={{flex:1,fontSize:12,padding:"8px 10px",borderRadius:10,border:"0.5px solid #e0e0e0",background:newT.nodue?"#f5f5f7":"#fff",color:"#1d1d1f"}}/>
  <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:"#7a7a7a",whiteSpace:"nowrap",cursor:"pointer"}}>
    <input type="checkbox" checked={!!newT.nodue} onChange={e=>setNewT(p=>({...p,nodue:e.target.checked,due:e.target.checked?"":p.due}))} style={{accentColor:"#0066cc"}}/>기한없음
  </label>
</div>
                <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:11,color:"#aaa"}}>중요도</span><Stars v={newT.stars} onChange={v=>setNewT(p=>({...p,stars:v}))}/></div>
              </div>
              {newT.status==="waiting"&&<input placeholder="회신 대기 담당자" value={newT.waiting_for} onChange={e=>setNewT(p=>({...p,waiting_for:e.target.value}))} style={{fontSize:12,padding:"8px 10px",borderRadius:10,border:"1px solid #ffcc80",background:"#fff9f0",color:"#1d1d1f",outline:"none"}}/>}
              <input placeholder="메모 (선택)" value={newT.memo} onChange={e=>setNewT(p=>({...p,memo:e.target.value}))} style={{fontSize:12,padding:"8px 10px",borderRadius:10,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f"}}/>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={closeModal} style={{fontSize:13,background:"none",border:"0.5px solid #d0d0d5",borderRadius:999,padding:"8px 18px",cursor:"pointer",color:"#555"}}>취소</button>
                <button onClick={addTask} style={{fontSize:13,background:"#0066cc",color:"#fff",border:"none",borderRadius:999,padding:"8px 20px",cursor:"pointer",fontWeight:500}}>저장</button>
              </div>
            </div>
          )}

          {modal==="cats"&&(
            <div style={{background:"#fff",borderRadius:mobile?"16px 16px 0 0":18,padding:24,width:mobile?"100%":"380px",maxHeight:"80vh",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:16,fontWeight:600}}>📂 카테고리 관리</div>
                <button onClick={closeModal} style={{fontSize:18,background:"none",border:"none",color:"#aaa",cursor:"pointer"}}>×</button>
              </div>
              <div style={{fontSize:12,color:"#7a7a7a"}}>수정 버튼으로 이름 변경 · 업무 없는 카테고리만 삭제 가능</div>
              <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:4}}>
                {cats.map((c,i)=>(
                  <div key={c} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:10,border:"0.5px solid #e8e8e8",background:"#fafafa"}}>
                    {catEditIdx===i
                      ?<input autoFocus value={catEditVal} onChange={e=>setCatEditVal(e.target.value)}
                          onKeyDown={e=>{if(e.key==="Enter")catSaveEdit(i);if(e.key==="Escape")setCatEditIdx(null);}}
                          onBlur={()=>catSaveEdit(i)}
                          style={{flex:1,fontSize:13,padding:"3px 7px",borderRadius:7,border:"1px solid #0066cc",outline:"none",color:"#1d1d1f"}}/>
                      :<span style={{flex:1,fontSize:13,color:"#1d1d1f"}}>{c}</span>
                    }
                    <span style={{fontSize:11,color:"#aaa"}}>{tasks.filter(t=>t.cat===c).length}건</span>
                    <button onClick={()=>catStartEdit(i)} style={{fontSize:11,color:"#0066cc",background:"none",border:"none",cursor:"pointer",padding:"2px 8px"}}>수정</button>
                    <button onClick={()=>catRemove(i)}
                      style={{fontSize:11,color:tasks.filter(t=>t.cat===c).length>0?"#ccc":"#c0392b",background:"none",border:"none",
                        cursor:tasks.filter(t=>t.cat===c).length>0?"not-allowed":"pointer",padding:"2px 8px"}}
                      title={tasks.filter(t=>t.cat===c).length>0?"업무가 있는 카테고리는 삭제 불가":""}>삭제</button>
                  </div>
                ))}
              </div>
              <div style={{borderTop:"0.5px solid #f0f0f0",paddingTop:12,display:"flex",gap:8}}>
                <input placeholder="새 카테고리 이름" value={newCatName} onChange={e=>setNewCatName(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&catAdd()}
                  style={{flex:1,fontSize:13,padding:"8px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f"}}/>
                <button onClick={catAdd} style={{fontSize:13,background:"#0066cc",color:"#fff",border:"none",borderRadius:999,padding:"8px 16px",cursor:"pointer",fontWeight:500}}>+ 추가</button>
              </div>
            </div>
          )}

          {modal==="cleanup"&&(
            <div style={{background:"#fff",borderRadius:mobile?"16px 16px 0 0":18,padding:24,width:mobile?"100%":"380px"}}>
              <div style={{fontSize:16,fontWeight:600,marginBottom:4}}>완료 항목 정리</div>
              <div style={{fontSize:12,color:"#7a7a7a",marginBottom:14}}>완료 상태이고 기한이 지난 항목을 삭제해요.</div>
              <div style={{display:"flex",gap:6,marginBottom:14}}>
                {[7,30,60,90].map(d=><button key={d} onClick={()=>setCD(d)} style={{fontSize:12,padding:"5px 12px",borderRadius:999,cursor:"pointer",background:cleanupDays===d?"#0066cc":"#f5f5f7",color:cleanupDays===d?"#fff":"#555",border:cleanupDays===d?"none":"0.5px solid #e0e0e0"}}>{d}일+</button>)}
              </div>
              <div style={{background:"#f5f5f7",borderRadius:10,padding:"8px 12px",maxHeight:160,overflowY:"auto",marginBottom:14}}>
                {cleanupTargets.length===0?<p style={{fontSize:12,color:"#aaa",margin:0}}>해당 항목 없음</p>
                  :cleanupTargets.map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:"0.5px solid #e8e8e8",color:"#1d1d1f"}}><span>{t.title}</span><span style={{color:"#aaa"}}>{t.due}</span></div>)}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:"#7a7a7a"}}>총 <b style={{color:"#c0392b"}}>{cleanupTargets.length}개</b></span>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={closeModal} style={{fontSize:12,background:"none",border:"0.5px solid #d0d0d5",borderRadius:999,padding:"6px 14px",cursor:"pointer",color:"#555"}}>취소</button>
                  <button disabled={cleanupTargets.length===0} onClick={()=>{const ids=new Set(cleanupTargets.map(t=>t.id));setTasks(p=>p.filter(t=>!ids.has(t.id)));setOrder(p=>p.filter(x=>!ids.has(x)));closeModal();}} style={{fontSize:12,background:cleanupTargets.length===0?"#e0e0e0":"#c0392b",color:"#fff",border:"none",borderRadius:999,padding:"6px 16px",cursor:cleanupTargets.length===0?"default":"pointer",fontWeight:500}}>삭제</button>
                </div>
              </div>
            </div>
          )}

          {modal==="archive"&&(
            <div style={{background:"#fff",borderRadius:mobile?"16px 16px 0 0":18,padding:24,width:mobile?"100%":"560px",maxHeight:"80vh",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:16,fontWeight:600}}>🗄 보관함</div>
                <button onClick={closeModal} style={{fontSize:18,background:"none",border:"none",color:"#aaa",cursor:"pointer"}}>×</button>
              </div>
              <input placeholder="검색…" value={archSearch} onChange={e=>setAS(e.target.value)} style={{fontSize:13,padding:"8px 12px",borderRadius:10,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f"}}/>
              {archives.length===0?<div style={{fontSize:13,color:"#aaa",textAlign:"center",padding:"24px 0"}}>보관된 업무가 없어요</div>
                :<div style={{overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
                  {(()=>{ const byDate={}; archives.forEach(t=>{const d=t.completedAt||"날짜 미정";if(!byDate[d])byDate[d]=[];byDate[d].push(t);}); return Object.entries(byDate).map(([date,items])=>(<div key={date}><div style={{fontSize:11,fontWeight:600,color:"#7a7a7a",padding:"4px 0 6px",borderBottom:"0.5px solid #f0f0f0",marginBottom:6}}>📅 {date}</div>{items.map(t=>(<div key={t.id} style={{background:"#fafafa",border:"0.5px solid #e8e8e8",borderRadius:10,padding:"10px 14px",marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:500}}>{t.title} <span style={{fontSize:11,color:"#aaa"}}>{t.cat}</span></span><Stars v={t.stars}/></div>{t.memo&&<div style={{fontSize:12,color:"#555",marginBottom:4}}>📝 {t.memo}</div>}{t.guide&&<details><summary style={{fontSize:11,color:"#0066cc",cursor:"pointer"}}>처리 방법 보기</summary><pre style={{fontSize:11,color:"#555",marginTop:6,whiteSpace:"pre-wrap",fontFamily:"inherit",lineHeight:1.6,background:"#f5f5f7",borderRadius:7,padding:"8px 10px"}}>{t.guide}</pre></details>}</div>))}</div>)); })()}
                </div>}
            </div>
          )}
        </div>
      )}
    </div>
{/* 하단 메모 */}
      <div style={{background:"#fff",borderTop:"0.5px solid #e0e0e0",flexShrink:0}}>
        {memos.length>0&&(
          <div style={{maxHeight:160,overflowY:"auto",padding:"8px 16px",display:"flex",flexDirection:"column",gap:6}}>
            {memos.map(m=>(
              <div key={m.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 10px",background:"#fffde7",borderRadius:8,border:"0.5px solid #fff176"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:"#1d1d1f",lineHeight:1.5}}>{m.content}</div>
                  <div style={{fontSize:10,color:"#aaa",marginTop:2}}>{m.created_at}</div>
                </div>
                <button onClick={()=>deleteMemo(m.id)} style={{fontSize:14,color:"#ccc",background:"none",border:"none",cursor:"pointer",padding:0,flexShrink:0}}>×</button>
              </div>
            ))}
          </div>
        )}
        {memoOpen&&(
          <div style={{padding:"8px 16px",display:"flex",gap:8,borderTop:"0.5px solid #f0f0f0"}}>
            <textarea autoFocus value={memoInput} onChange={e=>setMemoInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();addMemo();} }}
              placeholder="메모 내용 입력 후 Enter (줄바꿈은 Shift+Enter)"
              rows={2}
              style={{flex:1,fontSize:13,padding:"8px 10px",borderRadius:10,border:"0.5px solid #e0e0e0",resize:"none",fontFamily:"inherit",outline:"none",color:"#1d1d1f"}}/>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              <button onClick={addMemo} style={{fontSize:12,background:"#0066cc",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontWeight:500}}>저장</button>
              <button onClick={()=>{setMemoOpen(false);setMemoInput("");}} style={{fontSize:12,background:"#f5f5f7",color:"#555",border:"0.5px solid #e0e0e0",borderRadius:8,padding:"6px 12px",cursor:"pointer"}}>취소</button>
            </div>
          </div>
        )}
        <div style={{padding:"6px 16px"}}>
          <button onClick={()=>setMemoOpen(p=>!p)} style={{fontSize:12,color:"#0066cc",background:"none",border:"none",cursor:"pointer",padding:"4px 0",fontWeight:500}}>
            {memoOpen ? "✕ 닫기" : "+ 메모하기"}
          </button>
        </div>
      </div>
  );
}
