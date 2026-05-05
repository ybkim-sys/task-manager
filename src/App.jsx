import { api } from "./api.js";
import { useState, useMemo, useRef, useEffect } from "react";
const STATUSES = [
  { id:"todo",    label:"할 일",       bg:"#f5f5f7", color:"#555",    border:"#d0d0d5" },
  { id:"doing",   label:"진행 중",     bg:"#e8f1fb", color:"#0050a0", border:"#b5d0f0" },
  { id:"waiting", label:"회신 대기중", bg:"#fff3e0", color:"#bf5a00", border:"#ffcc80" },
  { id:"done",    label:"완료",        bg:"#e6f4ea", color:"#1a7f37", border:"#a8d5b5" },
  { id:"hold",    label:"보류",        bg:"#f3eeff", color:"#6835c9", border:"#c9b3f5" },
];
const INIT_CATS  = ["급여 및 4대보험","임직원 관리","규정관리","인사평가","SW관리","교육·행사","정부지원금","복리후생","외부연계"];
const FILE_TAGS  = ["인사","규정","급여","교육","계약","기타"];
const FILE_ICONS = { xlsx:"🟢", xls:"🟢", pdf:"🔴", docx:"🔵", doc:"🔵", pptx:"🟠", url:"🔗" };

const SAMPLE = [
  { id:1,  cat:"급여 및 4대보험", title:"5월 원천세 신고",        due:"2025-05-06", stars:5, status:"doing",   memo:"홈택스 전자신고", waiting_for:"", guide:"", checklist:[], archived:false },
  { id:2,  cat:"급여 및 4대보험", title:"퇴직연금 신규 처리",     due:"2025-05-15", stars:4, status:"waiting", memo:"", waiting_for:"노무법인 홍담당", guide:"", checklist:[], archived:false },
  { id:3,  cat:"임직원 관리",     title:"6월 입사자 근로계약",    due:"2025-05-20", stars:3, status:"todo",    memo:"3명 예정", waiting_for:"", guide:"", checklist:[], archived:false },
  { id:4,  cat:"임직원 관리",     title:"연차촉진 대상자 통보",   due:"2025-05-08", stars:4, status:"doing",   memo:"", waiting_for:"", guide:"", checklist:[], archived:false },
  { id:5,  cat:"규정관리",        title:"취업규칙 변경신고",      due:"2025-05-18", stars:5, status:"waiting", memo:"", waiting_for:"김대표 결재", guide:"", checklist:[], archived:false },
  { id:6,  cat:"인사평가",        title:"중간점검 일정 확정",     due:"2025-06-01", stars:3, status:"todo",    memo:"", waiting_for:"", guide:"", checklist:[], archived:false },
  { id:7,  cat:"SW관리",          title:"오피스365 갱신 견적",    due:"2025-05-12", stars:3, status:"doing",   memo:"", waiting_for:"", guide:"", checklist:[], archived:false },
  { id:8,  cat:"교육·행사",       title:"법정의무교육 일정 안내", due:"2025-05-07", stars:4, status:"todo",    memo:"전직원 대상", waiting_for:"", guide:"", checklist:[], archived:false },
  { id:9,  cat:"정부지원금",      title:"일자리도약 실적 보고",   due:"2025-05-30", stars:4, status:"todo",    memo:"", waiting_for:"", guide:"", checklist:[], archived:false },
  { id:10, cat:"복리후생",        title:"근로자휴가지원 신청",    due:"2025-05-25", stars:2, status:"hold",    memo:"예산 확인 후", waiting_for:"", guide:"", checklist:[], archived:false },
  { id:11, cat:"외부연계",        title:"여비규정 개정 검토",     due:"2025-05-22", stars:3, status:"waiting", memo:"", waiting_for:"노무사 의견", guide:"", checklist:[], archived:false },
  { id:12, cat:"급여 및 4대보험", title:"4대보험 준공정산",       due:"2025-05-05", stars:5, status:"doing",   memo:"현장 마감 임박", waiting_for:"", guide:"", checklist:[], archived:false },
];
const INIT_FILES = [
  { id:1, name:"직원 연락처 2025", type:"xlsx", url:"", memo:"전직원 연락처 및 내선번호", updatedAt:"2025-05-01", tag:"인사" },
  { id:2, name:"취업규칙 최신본",  type:"pdf",  url:"", memo:"2025년 개정본",             updatedAt:"2025-04-15", tag:"규정" },
];

let nid = 100;
let fid = 10;
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
    <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
      <span style={{fontSize:11,color,background:bg,borderRadius:5,padding:bg!=="transparent"?"1px 6px":"0",fontWeight:fw}}>{label}</span>
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
  return <span style={{fontSize:10,fontWeight:500,padding:"2px 7px",borderRadius:999,background:st.bg,color:st.color,border:`1px solid ${st.border}`,whiteSpace:"nowrap"}}>{st.label}</span>;
}
function Pill({ label, active, onClick, accent }) {
  return (
    <button onClick={onClick} style={{fontSize:11,padding:"4px 10px",borderRadius:999,cursor:"pointer",
      background:active?(accent||"#0066cc"):"#f5f5f7",color:active?"#fff":"#555",
      border:active?"none":"0.5px solid #e0e0e0",fontWeight:active?500:400}}>
      {label}
    </button>
  );
}

export default function App() {
  // ── tasks
  const [tasks,  setTasks]  = useState(SAMPLE);
  const [order,  setOrder]  = useState(SAMPLE.map(t=>t.id));
  const [sel,    setSel]    = useState(null);
  // ── filters
  const [filterStatus, setFS] = useState("active");
  const [filterCat,    setFC] = useState("전체");
  const [sortBy,       setSB] = useState("urgency");
  // ── modal
  const [modal, setModal]   = useState(null);
  // ── categories
  const [cats,       setCats]       = useState(INIT_CATS);
  const [catEditIdx, setCatEditIdx] = useState(null);
  const [catEditVal, setCatEditVal] = useState("");
  const [newCatName, setNewCatName] = useState("");
  // ── files
  const [files,       setFiles]      = useState(INIT_FILES);
  const [fileSearch,  setFileSearch] = useState("");
  const [fileTag,     setFileTag]    = useState("전체");
  const [addingFile,  setAddingFile] = useState(false);
  const [newFile,     setNewFile]    = useState({name:"",type:"url",url:"",memo:"",tag:"기타"});
  const [fileEditId,  setFileEditId] = useState(null);
  const [fileEditVal, setFileEditVal]= useState(null);
  // ── cleanup / archive
  const [cleanupDays, setCD]  = useState(30);
  const [archSearch,  setAS]  = useState("");
  // ── add task form
  const [newT, setNewT] = useState({cat:INIT_CATS[0],title:"",due:"",stars:3,status:"todo",memo:"",waiting_for:""});
// DB에서 데이터 불러오기
  useEffect(()=>{
    api.getTasks().then(data=>{ if(Array.isArray(data)) setTasks(data.map(t=>({...t, checklist:t.checklist?JSON.parse(t.checklist):[], archived:!!t.archived }))); });
    api.getCategories().then(data=>{ if(Array.isArray(data)) setCats(data.map(c=>c.name)); });
    api.getFiles().then(data=>{ if(Array.isArray(data)) setFiles(data); });
  },[]);
  // drag refs
  const dragId   = useRef(null);
  const dragOver = useRef(null);
  const cDragId  = useRef(null);
  const cDragOver= useRef(null);

  // ── derived
  const filtered = useMemo(()=>{
    let base = sortBy==="manual" ? order.map(id=>tasks.find(t=>t.id===id)).filter(Boolean) : [...tasks];
    if (filterStatus==="active") base=base.filter(x=>x.status!=="done");
    else if (filterStatus==="done") base=base.filter(x=>x.status==="done");
    else if (filterStatus!=="전체") base=base.filter(x=>x.status===filterStatus);
    if (filterCat!=="전체") base=base.filter(x=>x.cat===filterCat);
    if (sortBy==="urgency") base=[...base].sort((a,b)=>urgency(b)-urgency(a)||(a.due||"z").localeCompare(b.due||"z"));
    else if (sortBy==="stars") base=[...base].sort((a,b)=>b.stars-a.stars);
    else if (sortBy==="due")   base=[...base].sort((a,b)=>(a.due||"z").localeCompare(b.due||"z"));
    return base;
  },[tasks,order,filterStatus,filterCat,sortBy]);

  const selTask = sel ? tasks.find(t=>t.id===sel) : null;

  const archives = useMemo(()=>{
    const q=archSearch.toLowerCase();
    return tasks.filter(t=>t.archived)
      .filter(t=>!q||t.title.includes(q)||(t.memo||"").includes(q)||(t.guide||"").includes(q)||t.cat.includes(q))
      .sort((a,b)=>(b.completedAt||"").localeCompare(a.completedAt||""));
  },[tasks,archSearch]);

  const cleanupTargets = useMemo(()=>{
    const cut=new Date(); cut.setDate(cut.getDate()-cleanupDays);
    return tasks.filter(t=>t.status==="done"&&!t.archived&&t.due&&new Date(t.due)<=cut);
  },[tasks,cleanupDays]);

  const shownFiles = useMemo(()=>files.filter(f=>{
    const q=fileSearch.toLowerCase();
    return (!q||f.name.toLowerCase().includes(q)||(f.memo||"").toLowerCase().includes(q))
      &&(fileTag==="전체"||f.tag===fileTag);
  }),[files,fileSearch,fileTag]);

  const urgCounts = useMemo(()=>({
    overdue: tasks.filter(t=>t.status!=="done"&&t.status!=="hold"&&daysDiff(t.due)<0).length,
    soon:    tasks.filter(t=>t.status!=="done"&&t.status!=="hold"&&(d=>d!==null&&d>=0&&d<=3)(daysDiff(t.due))).length,
    waiting: tasks.filter(t=>t.status==="waiting").length,
  }),[tasks]);

  // ── task actions
  const upd = (id,patch) => setTasks(p=>p.map(t=>t.id===id?{...t,...patch}:t));
  const del = id => { setTasks(p=>p.filter(t=>t.id!==id)); setOrder(p=>p.filter(x=>x!==id)); if(sel===id)setSel(null); };
  const archiveTask = id => { upd(id,{status:"done",archived:true,completedAt:new Date().toISOString().slice(0,10)}); setSel(null); };
  const addTask = () => {
    if (!newT.title.trim()) return;
    const t={...newT,id:nid++,guide:"",checklist:[],archived:false};
    setTasks(p=>[...p,t]); setOrder(p=>[...p,t.id]);
    setNewT({cat:cats[0],title:"",due:"",stars:3,status:"todo",memo:"",waiting_for:""});
    setModal(null);
  };

  // ── task drag
  const onDS  = (e,id) => { dragId.current=id; e.dataTransfer.effectAllowed="move"; };
  const onDE  = (_e,id) => { dragOver.current=id; };
  const onDEnd = () => {
    const from=dragId.current, to=dragOver.current;
    if (!from||!to||from===to){dragId.current=dragOver.current=null;return;}
    const ids=filtered.map(t=>t.id);
    const fi=ids.indexOf(from), ti=ids.indexOf(to);
    if (fi<0||ti<0){dragId.current=dragOver.current=null;return;}
    ids.splice(fi,1); ids.splice(ti,0,from);
    setOrder(ids); setSB("manual");
    dragId.current=dragOver.current=null;
  };

  // ── category actions
  const catStartEdit = i => { setCatEditIdx(i); setCatEditVal(cats[i]); };
  const catSaveEdit  = i => {
    const v=catEditVal.trim(); if(!v){setCatEditIdx(null);return;}
    const old=cats[i];
    setCats(p=>p.map((c,j)=>j===i?v:c));
    setTasks(p=>p.map(t=>t.cat===old?{...t,cat:v}:t));
    setCatEditIdx(null);
  };
  const catRemove = i => { if(tasks.filter(t=>t.cat===cats[i]).length>0)return; setCats(p=>p.filter((_,j)=>j!==i)); };
  const catAdd    = () => {
    const v=newCatName.trim(); if(!v||cats.includes(v))return;
    setCats(p=>[...p,v]); setNewCatName("");
  };
  const onCatDS   = i => { cDragId.current=i; };
  const onCatDE   = i => { cDragOver.current=i; };
  const onCatDEnd = () => {
    const f=cDragId.current, t=cDragOver.current;
    if(f!==null&&t!==null&&f!==t){const a=[...cats];a.splice(t,0,a.splice(f,1)[0]);setCats(a);}
    cDragId.current=cDragOver.current=null;
  };

  // ── file actions
  const saveNewFile = () => {
    if(!newFile.name.trim())return;
    setFiles(p=>[...p,{...newFile,id:fid++,updatedAt:new Date().toISOString().slice(0,10)}]);
    setNewFile({name:"",type:"url",url:"",memo:"",tag:"기타"}); setAddingFile(false);
  };
  const saveFileEdit = () => {
    setFiles(p=>p.map(f=>f.id===fileEditId?{...fileEditVal,updatedAt:new Date().toISOString().slice(0,10)}:f));
    setFileEditId(null); setFileEditVal(null);
  };

  // ── close modal helper (resets file states too)
  const closeModal = () => {
    setModal(null);
    setAddingFile(false);
    setFileEditId(null);
    setFileEditVal(null);
    setCatEditIdx(null);
  };

  return (
    <div style={{fontFamily:"-apple-system,'Inter',sans-serif",color:"#1d1d1f",height:"100vh",display:"flex",flexDirection:"column",background:"#f5f5f7",overflow:"hidden"}}>

      {/* Header */}
      <div style={{background:"#fff",borderBottom:"0.5px solid #e0e0e0",padding:"10px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:160}}>
          <span style={{fontSize:16,fontWeight:600,letterSpacing:"-0.3px"}}>업무 관리</span>
          <span style={{fontSize:11,color:"#7a7a7a",marginLeft:10}}>GC 인사쟁이 김영빈 차장님 화이팅입니다 💪</span>
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
          {urgCounts.overdue>0&&<span style={{fontSize:11,background:"#c0392b",color:"#fff",borderRadius:999,padding:"2px 8px",fontWeight:600}}>D+ {urgCounts.overdue}건</span>}
          {urgCounts.soon>0&&<span style={{fontSize:11,background:"#fcd9d9",color:"#c0392b",borderRadius:999,padding:"2px 8px",fontWeight:600}}>D-3이내 {urgCounts.soon}건</span>}
          {urgCounts.waiting>0&&<span style={{fontSize:11,background:"#fff3e0",color:"#bf5a00",borderRadius:999,padding:"2px 8px"}}>회신대기 {urgCounts.waiting}건</span>}
        </div>
        <div style={{display:"flex",gap:5}}>
          <button onClick={()=>setModal("add")}     style={{fontSize:12,background:"#0066cc",color:"#fff",border:"none",borderRadius:999,padding:"5px 12px",cursor:"pointer",fontWeight:500}}>+ 추가</button>
          <button onClick={()=>setModal("files")}   style={{fontSize:11,background:"#f5f5f7",color:"#555",border:"0.5px solid #e0e0e0",borderRadius:999,padding:"5px 10px",cursor:"pointer"}}>📎 파일</button>
          <button onClick={()=>setModal("archive")} style={{fontSize:11,background:"#f5f5f7",color:"#555",border:"0.5px solid #e0e0e0",borderRadius:999,padding:"5px 10px",cursor:"pointer"}}>🗄 보관함</button>
          <button onClick={()=>setModal("cats")}    style={{fontSize:11,background:"#f5f5f7",color:"#555",border:"0.5px solid #e0e0e0",borderRadius:999,padding:"5px 10px",cursor:"pointer"}}>📂 카테고리</button>
          <button onClick={()=>setModal("cleanup")} style={{fontSize:11,background:"#f5f5f7",color:"#7a7a7a",border:"0.5px solid #e0e0e0",borderRadius:999,padding:"5px 10px",cursor:"pointer"}}>🗑 정리</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{background:"#fff",borderBottom:"0.5px solid #e0e0e0",padding:"6px 16px",display:"flex",gap:5,alignItems:"center",flexWrap:"wrap",flexShrink:0}}>
        <span style={{fontSize:11,color:"#aaa"}}>상태</span>
        <Pill label="진행 중"  active={filterStatus==="active"}  onClick={()=>setFS("active")}/>
        <Pill label="전체"     active={filterStatus==="전체"}    onClick={()=>setFS("전체")}/>
        <Pill label="할 일"    active={filterStatus==="todo"}    onClick={()=>setFS("todo")}/>
        <Pill label="회신대기" active={filterStatus==="waiting"} onClick={()=>setFS("waiting")} accent="#bf5a00"/>
        <Pill label="완료"     active={filterStatus==="done"}    onClick={()=>setFS("done")} accent="#1a7f37"/>
        <span style={{width:1,height:14,background:"#e0e0e0",margin:"0 2px"}}/>
        <span style={{fontSize:11,color:"#aaa"}}>정렬</span>
        <Pill label="긴급순" active={sortBy==="urgency"} onClick={()=>setSB("urgency")}/>
        <Pill label="별점순" active={sortBy==="stars"}   onClick={()=>setSB("stars")}/>
        <Pill label="기한순" active={sortBy==="due"}     onClick={()=>setSB("due")}/>
        {sortBy==="manual"&&<Pill label="직접정렬 중" active={true} onClick={()=>{}} accent="#6835c9"/>}
        <span style={{width:1,height:14,background:"#e0e0e0",margin:"0 2px"}}/>
        <select value={filterCat} onChange={e=>setFC(e.target.value)}
          style={{fontSize:11,padding:"3px 8px",borderRadius:8,border:"0.5px solid #e0e0e0",background:"#f5f5f7",color:"#555"}}>
          <option>전체</option>
          {cats.map(c=><option key={c}>{c}</option>)}
        </select>
        <span style={{marginLeft:"auto",fontSize:11,color:"#aaa"}}>{filtered.length}건</span>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* Task list */}
        <div style={{flex:1,overflowY:"auto",padding:"10px 12px"}}>
          {sortBy==="manual"&&<div style={{fontSize:11,color:"#6835c9",marginBottom:6,paddingLeft:4}}>☰ 드래그로 순서 변경 가능</div>}
          <table style={{width:"100%",borderCollapse:"separate",borderSpacing:"0 4px"}}>
            <thead>
              <tr style={{fontSize:11,color:"#aaa"}}>
                {sortBy==="manual"&&<th style={{width:20,fontWeight:400}}/>}
                <th style={{textAlign:"left",padding:"0 8px",fontWeight:400,width:130}}>카테고리</th>
                <th style={{textAlign:"left",padding:"0 8px",fontWeight:400}}>업무</th>
                <th style={{textAlign:"center",padding:"0 8px",fontWeight:400,width:70}}>중요도</th>
                <th style={{textAlign:"center",padding:"0 8px",fontWeight:400,width:90}}>상태</th>
                <th style={{textAlign:"center",padding:"0 8px",fontWeight:400,width:90}}>기한</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t=>{
                const isSel=sel===t.id;
                const {bg,bl}=rowBg(t,isSel);
                return (
                  <tr key={t.id} draggable
                    onDragStart={e=>onDS(e,t.id)} onDragEnter={e=>onDE(e,t.id)}
                    onDragEnd={onDEnd} onDragOver={e=>e.preventDefault()}
                    onClick={()=>setSel(isSel?null:t.id)}
                    style={{cursor:"pointer",background:bg,borderLeft:bl,borderRadius:10,transition:"background 0.15s",userSelect:"none"}}>
                    {sortBy==="manual"&&<td style={{padding:"8px 4px 8px 8px",borderRadius:"10px 0 0 10px",color:"#ccc",fontSize:13,cursor:"grab"}}>☰</td>}
                    <td style={{padding:"8px",borderRadius:sortBy==="manual"?"0":"10px 0 0 10px",fontSize:12,color:"#7a7a7a",whiteSpace:"nowrap",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis"}}>{t.cat}</td>
                    <td style={{padding:"8px",fontSize:13,fontWeight:t.status==="done"?400:500,color:t.status==="done"?"#aaa":"#1d1d1f",textDecoration:t.status==="done"?"line-through":"none"}}>
                      {t.title}
                      {t.waiting_for&&<span style={{fontSize:10,color:"#bf5a00",marginLeft:6,background:"#fff3e0",padding:"1px 5px",borderRadius:4}}>⏳{t.waiting_for}</span>}
                      {t.memo&&<span style={{fontSize:10,color:"#aaa",marginLeft:4}}>📝</span>}
                      {(t.checklist||[]).length>0&&<span style={{fontSize:10,color:"#aaa",marginLeft:4}}>[{(t.checklist||[]).filter(x=>x.done).length}/{(t.checklist||[]).length}]</span>}
                      {t.archived&&<span style={{fontSize:10,color:"#1a7f37",marginLeft:4}}>📦</span>}
                    </td>
                    <td style={{padding:"8px",textAlign:"center"}}><Stars v={t.stars}/></td>
                    <td style={{padding:"8px 4px",textAlign:"center"}}><StatusBadge s={t.status}/></td>
                    <td style={{padding:"8px",textAlign:"center",borderRadius:"0 10px 10px 0"}}><DueBadge due={t.due} status={t.status}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Side panel */}
        {selTask&&(
          <div style={{width:380,background:"#fff",borderLeft:"0.5px solid #e0e0e0",padding:16,overflowY:"auto",flexShrink:0,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <span style={{fontSize:13,fontWeight:600,color:"#1d1d1f",lineHeight:1.4,flex:1}}>{selTask.title}</span>
              <button onClick={()=>setSel(null)} style={{fontSize:18,background:"none",border:"none",color:"#aaa",cursor:"pointer",padding:0,marginLeft:8}}>×</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                ["카테고리", <select value={selTask.cat} onChange={e=>upd(selTask.id,{cat:e.target.value})} style={{fontSize:12,padding:"4px 8px",borderRadius:7,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%"}}>{cats.map(c=><option key={c}>{c}</option>)}</select>],
                ["상태",     <select value={selTask.status} onChange={e=>upd(selTask.id,{status:e.target.value})} style={{fontSize:12,padding:"4px 8px",borderRadius:7,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%"}}>{STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>],
                ["기한",     <input type="date" value={selTask.due} onChange={e=>upd(selTask.id,{due:e.target.value})} style={{fontSize:12,padding:"4px 8px",borderRadius:7,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%"}}/>],
                ["중요도",   <Stars v={selTask.stars} onChange={v=>upd(selTask.id,{stars:v})}/>],
              ].map(([label,el])=>(
                <div key={label}><div style={{fontSize:10,color:"#aaa",marginBottom:3}}>{label}</div>{el}</div>
              ))}
              {selTask.status==="waiting"&&(
                <div>
                  <div style={{fontSize:10,color:"#bf5a00",marginBottom:3}}>회신 대기 담당자</div>
                  <input value={selTask.waiting_for} placeholder="누구의 회신을 기다리나요?" onChange={e=>upd(selTask.id,{waiting_for:e.target.value})}
                    style={{fontSize:12,padding:"4px 8px",borderRadius:7,border:"1px solid #ffcc80",background:"#fff9f0",color:"#1d1d1f",width:"100%",boxSizing:"border-box"}}/>
                </div>
              )}
              <div>
                <div style={{fontSize:10,color:"#aaa",marginBottom:3}}>메모</div>
                <textarea value={selTask.memo} rows={2} placeholder="참고사항, 링크 등" onChange={e=>upd(selTask.id,{memo:e.target.value})}
                  style={{fontSize:12,padding:"4px 8px",borderRadius:7,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"}}/>
              </div>
            </div>
            <div style={{borderTop:"0.5px solid #f0f0f0",paddingTop:12}}>
              <div style={{fontSize:11,fontWeight:500,color:"#1d1d1f",marginBottom:6}}>처리 방법</div>
              <textarea value={selTask.guide||""} rows={14} placeholder={"처리 절차, 참고사항, 관련 시스템 등\n\n예)\n1. 홈택스 로그인\n2. 전자신고 → 원천세 선택\n3. 신고서 작성 후 제출"}
                onChange={e=>upd(selTask.id,{guide:e.target.value})}
                style={{fontSize:12,padding:"8px 10px",borderRadius:7,border:"0.5px solid #e0e0e0",background:"#f9f9f9",color:"#1d1d1f",width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",lineHeight:1.7}}/>
            </div>
            <div style={{borderTop:"0.5px solid #f0f0f0",paddingTop:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:11,fontWeight:500,color:"#1d1d1f"}}>세부 체크리스트</div>
                <button onClick={()=>upd(selTask.id,{checklist:[...(selTask.checklist||[]),{id:Date.now(),text:"",done:false}]})}
                  style={{fontSize:11,color:"#0066cc",background:"none",border:"none",cursor:"pointer",padding:0}}>+ 항목 추가</button>
              </div>
              {(selTask.checklist||[]).length===0
                ? <div style={{fontSize:11,color:"#bbb",padding:"4px 0"}}>세부 단계를 추가해보세요</div>
                : (selTask.checklist||[]).map((item,i)=>(
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                    <input type="checkbox" checked={item.done} onChange={e=>{const cl=[...(selTask.checklist||[])];cl[i]={...cl[i],done:e.target.checked};upd(selTask.id,{checklist:cl});}} style={{accentColor:"#0066cc",flexShrink:0}}/>
                    <input value={item.text} placeholder="세부 항목" onChange={e=>{const cl=[...(selTask.checklist||[])];cl[i]={...cl[i],text:e.target.value};upd(selTask.id,{checklist:cl});}}
                      style={{flex:1,fontSize:12,padding:"3px 6px",borderRadius:6,border:"0.5px solid #e0e0e0",background:item.done?"#f5f5f7":"#fff",color:item.done?"#aaa":"#1d1d1f",textDecoration:item.done?"line-through":"none",outline:"none"}}/>
                    <button onClick={()=>upd(selTask.id,{checklist:(selTask.checklist||[]).filter((_,j)=>j!==i)})} style={{fontSize:14,color:"#ccc",background:"none",border:"none",cursor:"pointer",padding:0}}>×</button>
                  </div>
                ))
              }
              {(selTask.checklist||[]).length>0&&<div style={{fontSize:10,color:"#aaa",marginTop:4}}>{(selTask.checklist||[]).filter(x=>x.done).length}/{(selTask.checklist||[]).length} 완료</div>}
            </div>
            <div style={{display:"flex",gap:8,marginTop:4}}>
              {!selTask.archived
                ? <button onClick={()=>archiveTask(selTask.id)} style={{flex:1,fontSize:12,color:"#1a7f37",background:"#f0faf3",border:"0.5px solid #a8d5b5",borderRadius:8,padding:"7px",cursor:"pointer",fontWeight:500}}>✓ 완료 &amp; 보관</button>
                : <div style={{flex:1,fontSize:11,color:"#1a7f37",background:"#f0faf3",border:"0.5px solid #a8d5b5",borderRadius:8,padding:"7px",textAlign:"center"}}>📦 보관됨 · {selTask.completedAt}</div>
              }
              <button onClick={()=>del(selTask.id)} style={{fontSize:12,color:"#c0392b",background:"none",border:"0.5px solid #f5c6c6",borderRadius:8,padding:"7px 14px",cursor:"pointer"}}>삭제</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}
          onClick={e=>{if(e.target===e.currentTarget)closeModal();}}>

          {/* ADD */}
          {modal==="add"&&(
            <div style={{background:"#fff",borderRadius:18,padding:24,width:360,display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:16,fontWeight:600}}>새 업무 추가</div>
              <input placeholder="업무 제목" value={newT.title} onChange={e=>setNewT(p=>({...p,title:e.target.value}))}
                style={{fontSize:13,padding:"8px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f"}}/>
              <div style={{display:"flex",gap:8}}>
                <select value={newT.cat} onChange={e=>setNewT(p=>({...p,cat:e.target.value}))} style={{flex:1,fontSize:12,padding:"7px 8px",borderRadius:8,border:"0.5px solid #e0e0e0",background:"#fff",color:"#1d1d1f"}}>{cats.map(c=><option key={c}>{c}</option>)}</select>
                <select value={newT.status} onChange={e=>setNewT(p=>({...p,status:e.target.value}))} style={{flex:1,fontSize:12,padding:"7px 8px",borderRadius:8,border:"0.5px solid #e0e0e0",background:"#fff",color:"#1d1d1f"}}>{STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="date" value={newT.due} onChange={e=>setNewT(p=>({...p,due:e.target.value}))} style={{flex:1,fontSize:12,padding:"7px 8px",borderRadius:8,border:"0.5px solid #e0e0e0",background:"#fff",color:"#1d1d1f"}}/>
                <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:11,color:"#aaa"}}>중요도</span><Stars v={newT.stars} onChange={v=>setNewT(p=>({...p,stars:v}))}/></div>
              </div>
              {newT.status==="waiting"&&<input placeholder="회신 대기 담당자" value={newT.waiting_for} onChange={e=>setNewT(p=>({...p,waiting_for:e.target.value}))} style={{fontSize:12,padding:"7px 10px",borderRadius:8,border:"1px solid #ffcc80",background:"#fff9f0",color:"#1d1d1f",outline:"none"}}/>}
              <input placeholder="메모 (선택)" value={newT.memo} onChange={e=>setNewT(p=>({...p,memo:e.target.value}))} style={{fontSize:12,padding:"7px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f"}}/>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <button onClick={closeModal} style={{fontSize:13,background:"none",border:"0.5px solid #d0d0d5",borderRadius:999,padding:"6px 16px",cursor:"pointer",color:"#555"}}>취소</button>
                <button onClick={addTask} style={{fontSize:13,background:"#0066cc",color:"#fff",border:"none",borderRadius:999,padding:"6px 18px",cursor:"pointer",fontWeight:500}}>저장</button>
              </div>
            </div>
          )}

          {/* CLEANUP */}
          {modal==="cleanup"&&(
            <div style={{background:"#fff",borderRadius:18,padding:24,width:380}}>
              <div style={{fontSize:16,fontWeight:600,marginBottom:4}}>완료 항목 정리</div>
              <div style={{fontSize:12,color:"#7a7a7a",marginBottom:14}}>완료 상태이고 기한이 지난 항목을 삭제해요. (보관된 항목 제외)</div>
              <div style={{display:"flex",gap:6,marginBottom:14}}>
                {[7,30,60,90].map(d=><button key={d} onClick={()=>setCD(d)} style={{fontSize:12,padding:"4px 12px",borderRadius:999,cursor:"pointer",background:cleanupDays===d?"#0066cc":"#f5f5f7",color:cleanupDays===d?"#fff":"#555",border:cleanupDays===d?"none":"0.5px solid #e0e0e0"}}>{d}일 이상</button>)}
              </div>
              <div style={{background:"#f5f5f7",borderRadius:10,padding:"8px 12px",maxHeight:160,overflowY:"auto",marginBottom:14}}>
                {cleanupTargets.length===0
                  ? <p style={{fontSize:12,color:"#aaa",margin:0}}>해당 항목 없음</p>
                  : cleanupTargets.map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:"0.5px solid #e8e8e8",color:"#1d1d1f"}}><span>{t.title} <span style={{color:"#aaa",fontSize:11}}>{t.cat}</span></span><span style={{color:"#aaa",fontSize:11}}>{t.due}</span></div>)
                }
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:12,color:"#7a7a7a"}}>총 <b style={{color:"#c0392b"}}>{cleanupTargets.length}개</b> 삭제 예정</span>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={closeModal} style={{fontSize:12,background:"none",border:"0.5px solid #d0d0d5",borderRadius:999,padding:"5px 14px",cursor:"pointer",color:"#555"}}>취소</button>
                  <button disabled={cleanupTargets.length===0} onClick={()=>{const ids=new Set(cleanupTargets.map(t=>t.id));setTasks(p=>p.filter(t=>!ids.has(t.id)));setOrder(p=>p.filter(x=>!ids.has(x)));closeModal();}}
                    style={{fontSize:12,background:cleanupTargets.length===0?"#e0e0e0":"#c0392b",color:"#fff",border:"none",borderRadius:999,padding:"5px 16px",cursor:cleanupTargets.length===0?"default":"pointer",fontWeight:500}}>삭제</button>
                </div>
              </div>
            </div>
          )}

          {/* ARCHIVE */}
          {modal==="archive"&&(
            <div style={{background:"#fff",borderRadius:18,padding:24,width:560,maxHeight:"80vh",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:16,fontWeight:600}}>🗄 보관함</div>
                <button onClick={closeModal} style={{fontSize:18,background:"none",border:"none",color:"#aaa",cursor:"pointer"}}>×</button>
              </div>
              <input placeholder="제목, 메모, 처리방법 검색…" value={archSearch} onChange={e=>setAS(e.target.value)}
                style={{fontSize:13,padding:"8px 12px",borderRadius:10,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f"}}/>
              {archives.length===0
                ? <div style={{fontSize:13,color:"#aaa",textAlign:"center",padding:"24px 0"}}>보관된 업무가 없어요</div>
                : <div style={{overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
                    {(()=>{
                      const byDate={};
                      archives.forEach(t=>{const d=t.completedAt||"날짜 미정";if(!byDate[d])byDate[d]=[];byDate[d].push(t);});
                      return Object.entries(byDate).map(([date,items])=>(
                        <div key={date}>
                          <div style={{fontSize:11,fontWeight:600,color:"#7a7a7a",padding:"4px 0 6px",borderBottom:"0.5px solid #f0f0f0",marginBottom:6}}>📅 {date}</div>
                          {items.map(t=>(
                            <div key={t.id} style={{background:"#fafafa",border:"0.5px solid #e8e8e8",borderRadius:10,padding:"10px 14px",marginBottom:6}}>
                              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                                <span style={{fontSize:13,fontWeight:500}}>{t.title} <span style={{fontSize:11,color:"#aaa"}}>{t.cat}</span></span>
                                <Stars v={t.stars}/>
                              </div>
                              {t.memo&&<div style={{fontSize:12,color:"#555",marginBottom:4}}>📝 {t.memo}</div>}
                              {t.guide&&<details><summary style={{fontSize:11,color:"#0066cc",cursor:"pointer"}}>처리 방법 보기</summary><pre style={{fontSize:11,color:"#555",marginTop:6,whiteSpace:"pre-wrap",fontFamily:"inherit",lineHeight:1.6,background:"#f5f5f7",borderRadius:7,padding:"8px 10px"}}>{t.guide}</pre></details>}
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
              }
            </div>
          )}

          {/* CATEGORY MANAGER */}
          {modal==="cats"&&(
            <div style={{background:"#fff",borderRadius:18,padding:24,width:380,maxHeight:"80vh",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:16,fontWeight:600}}>📂 카테고리 관리</div>
                <button onClick={closeModal} style={{fontSize:18,background:"none",border:"none",color:"#aaa",cursor:"pointer"}}>×</button>
              </div>
              <div style={{fontSize:12,color:"#7a7a7a"}}>드래그로 순서 변경 · 수정 버튼으로 이름 변경</div>
              <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:4}}>
                {cats.map((c,i)=>(
                  <div key={c} draggable
                    onDragStart={()=>onCatDS(i)} onDragEnter={()=>onCatDE(i)}
                    onDragEnd={onCatDEnd} onDragOver={e=>e.preventDefault()}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,border:"0.5px solid #e8e8e8",background:"#fafafa",userSelect:"none"}}>
                    <span style={{color:"#ccc",fontSize:13,flexShrink:0,cursor:"grab"}}>☰</span>
                    {catEditIdx===i
                      ? <input autoFocus value={catEditVal} onChange={e=>setCatEditVal(e.target.value)}
                          onKeyDown={e=>{if(e.key==="Enter")catSaveEdit(i);if(e.key==="Escape")setCatEditIdx(null);}}
                          onBlur={()=>catSaveEdit(i)}
                          style={{flex:1,fontSize:13,padding:"3px 7px",borderRadius:7,border:"1px solid #0066cc",outline:"none",color:"#1d1d1f"}}/>
                      : <span style={{flex:1,fontSize:13,color:"#1d1d1f"}}>{c}</span>
                    }
                    <span style={{fontSize:11,color:"#aaa"}}>{tasks.filter(t=>t.cat===c).length}건</span>
                    <button onClick={()=>catStartEdit(i)} style={{fontSize:11,color:"#0066cc",background:"none",border:"none",cursor:"pointer",padding:"2px 6px"}}>수정</button>
                    <button onClick={()=>catRemove(i)}
                      style={{fontSize:11,color:tasks.filter(t=>t.cat===c).length>0?"#ccc":"#c0392b",background:"none",border:"none",cursor:tasks.filter(t=>t.cat===c).length>0?"not-allowed":"pointer",padding:"2px 6px"}}
                      title={tasks.filter(t=>t.cat===c).length>0?"업무가 있는 카테고리는 삭제 불가":""}>삭제</button>
                  </div>
                ))}
              </div>
              <div style={{borderTop:"0.5px solid #f0f0f0",paddingTop:12,display:"flex",gap:8}}>
                <input placeholder="새 카테고리 이름" value={newCatName} onChange={e=>setNewCatName(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&catAdd()}
                  style={{flex:1,fontSize:13,padding:"7px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f"}}/>
                <button onClick={catAdd} style={{fontSize:13,background:"#0066cc",color:"#fff",border:"none",borderRadius:999,padding:"7px 16px",cursor:"pointer",fontWeight:500}}>+ 추가</button>
              </div>
            </div>
          )}

          {/* FILES */}
          {modal==="files"&&(
            <div style={{background:"#fff",borderRadius:18,padding:24,width:540,maxHeight:"82vh",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:16,fontWeight:600}}>📎 중요 파일 보관</div>
                <button onClick={closeModal} style={{fontSize:18,background:"none",border:"none",color:"#aaa",cursor:"pointer"}}>×</button>
              </div>
              <div style={{fontSize:12,color:"#7a7a7a"}}>구글드라이브, 사내서버, 웹URL 링크를 등록해두면 어디서든 바로 접근할 수 있어요.</div>
              <div style={{display:"flex",gap:8}}>
                <input placeholder="파일명, 메모 검색…" value={fileSearch} onChange={e=>setFileSearch(e.target.value)}
                  style={{flex:1,fontSize:12,padding:"7px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f"}}/>
                <button onClick={()=>setAddingFile(p=>!p)} style={{fontSize:12,background:"#0066cc",color:"#fff",border:"none",borderRadius:999,padding:"7px 14px",cursor:"pointer",fontWeight:500}}>+ 추가</button>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {["전체",...FILE_TAGS].map(t=><button key={t} onClick={()=>setFileTag(t)} style={{fontSize:11,padding:"3px 10px",borderRadius:999,cursor:"pointer",background:fileTag===t?"#0066cc":"#f5f5f7",color:fileTag===t?"#fff":"#555",border:fileTag===t?"none":"0.5px solid #e0e0e0"}}>{t}</button>)}
              </div>
              {addingFile&&(
                <div style={{background:"#f5f5f7",borderRadius:12,padding:14,display:"flex",flexDirection:"column",gap:8,border:"0.5px solid #e0e0e0"}}>
                  <div style={{display:"flex",gap:8}}>
                    <input placeholder="파일/링크 이름" value={newFile.name} onChange={e=>setNewFile(p=>({...p,name:e.target.value}))} style={{flex:2,fontSize:12,padding:"6px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f",background:"#fff"}}/>
                    <select value={newFile.tag} onChange={e=>setNewFile(p=>({...p,tag:e.target.value}))} style={{flex:1,fontSize:12,padding:"6px 8px",borderRadius:8,border:"0.5px solid #e0e0e0",background:"#fff",color:"#1d1d1f"}}>{FILE_TAGS.map(t=><option key={t}>{t}</option>)}</select>
                  </div>
                  <input placeholder="링크 URL (구글드라이브, 사내서버 등)" value={newFile.url} onChange={e=>setNewFile(p=>({...p,url:e.target.value}))} style={{fontSize:12,padding:"6px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f",background:"#fff"}}/>
                  <input placeholder="메모 (선택)" value={newFile.memo} onChange={e=>setNewFile(p=>({...p,memo:e.target.value}))} style={{fontSize:12,padding:"6px 10px",borderRadius:8,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f",background:"#fff"}}/>
                  <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                    <button onClick={()=>setAddingFile(false)} style={{fontSize:12,background:"none",border:"0.5px solid #d0d0d5",borderRadius:999,padding:"5px 14px",cursor:"pointer",color:"#555"}}>취소</button>
                    <button onClick={saveNewFile} style={{fontSize:12,background:"#0066cc",color:"#fff",border:"none",borderRadius:999,padding:"5px 16px",cursor:"pointer",fontWeight:500}}>저장</button>
                  </div>
                </div>
              )}
              <div style={{overflowY:"auto",flex:1,display:"flex",flexDirection:"column",gap:6}}>
                {shownFiles.length===0
                  ? <div style={{fontSize:13,color:"#aaa",textAlign:"center",padding:"24px 0"}}>파일이 없어요</div>
                  : shownFiles.map(f=>(
                    <div key={f.id} style={{background:"#fafafa",border:"0.5px solid #e8e8e8",borderRadius:10,padding:"10px 14px"}}>
                      {fileEditId===f.id && fileEditVal
                        ? <div style={{display:"flex",flexDirection:"column",gap:8}}>
                            <div style={{display:"flex",gap:8}}>
                              <input value={fileEditVal.name} onChange={e=>setFileEditVal(p=>({...p,name:e.target.value}))} style={{flex:2,fontSize:12,padding:"5px 8px",borderRadius:7,border:"1px solid #0066cc",outline:"none",color:"#1d1d1f"}}/>
                              <select value={fileEditVal.tag} onChange={e=>setFileEditVal(p=>({...p,tag:e.target.value}))} style={{flex:1,fontSize:12,padding:"5px 8px",borderRadius:7,border:"0.5px solid #e0e0e0",background:"#fff",color:"#1d1d1f"}}>{FILE_TAGS.map(t=><option key={t}>{t}</option>)}</select>
                            </div>
                            <input value={fileEditVal.url} onChange={e=>setFileEditVal(p=>({...p,url:e.target.value}))} placeholder="링크 URL" style={{fontSize:12,padding:"5px 8px",borderRadius:7,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f"}}/>
                            <input value={fileEditVal.memo} onChange={e=>setFileEditVal(p=>({...p,memo:e.target.value}))} placeholder="메모" style={{fontSize:12,padding:"5px 8px",borderRadius:7,border:"0.5px solid #e0e0e0",outline:"none",color:"#1d1d1f"}}/>
                            <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                              <button onClick={()=>{setFileEditId(null);setFileEditVal(null);}} style={{fontSize:11,background:"none",border:"0.5px solid #d0d0d5",borderRadius:999,padding:"4px 12px",cursor:"pointer",color:"#555"}}>취소</button>
                              <button onClick={saveFileEdit} style={{fontSize:11,background:"#0066cc",color:"#fff",border:"none",borderRadius:999,padding:"4px 14px",cursor:"pointer",fontWeight:500}}>저장</button>
                            </div>
                          </div>
                        : <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                            <span style={{fontSize:20,flexShrink:0}}>{FILE_ICONS[f.type]||"📄"}</span>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                                <span style={{fontSize:13,fontWeight:500,color:"#1d1d1f"}}>{f.name}</span>
                                <span style={{fontSize:10,background:"#e8f1fb",color:"#0050a0",borderRadius:5,padding:"1px 6px"}}>{f.tag}</span>
                              </div>
                              {f.memo&&<div style={{fontSize:11,color:"#7a7a7a",marginBottom:3}}>{f.memo}</div>}
                              {f.url?<a href={f.url} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#0066cc",wordBreak:"break-all"}}>{f.url}</a>:<span style={{fontSize:11,color:"#bbb"}}>링크 없음</span>}
                              <div style={{fontSize:10,color:"#bbb",marginTop:3}}>업데이트 {f.updatedAt}</div>
                            </div>
                            <div style={{display:"flex",gap:4,flexShrink:0}}>
                              <button onClick={()=>{setFileEditId(f.id);setFileEditVal({...f});}} style={{fontSize:11,color:"#0066cc",background:"none",border:"0.5px solid #b0cce8",borderRadius:6,padding:"3px 8px",cursor:"pointer"}}>수정</button>
                              <button onClick={()=>setFiles(p=>p.filter(x=>x.id!==f.id))} style={{fontSize:11,color:"#c0392b",background:"none",border:"0.5px solid #f5c6c6",borderRadius:6,padding:"3px 8px",cursor:"pointer"}}>삭제</button>
                            </div>
                          </div>
                      }
                    </div>
                  ))
                }
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}