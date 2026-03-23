import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────
// This is your Rails server. No API keys live here — they're safe in .env on the server.
const API_BASE = "http://localhost:3000/api";

async function apiGet(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data;
}

// ─── UTILITIES ────────────────────────────────────────────────────────────
const partyColor = (p) => p === "D" ? "#4a9eff" : p === "R" ? "#ff4a4a" : "#c084fc";
const partyLabel = (p) => p === "D" ? "Democrat" : p === "R" ? "Republican" : p || "Independent";
const fmt = (n) =>
  !n ? "—"
  : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000    ? `$${(n / 1_000).toFixed(0)}K`
  : `$${n}`;

// ─── SKELETON ─────────────────────────────────────────────────────────────
function Skeleton({ height = 48, radius = 8 }) {
  return (
    <div style={{
      width: "100%", height, borderRadius: radius,
      background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.04) 75%)",
      backgroundSize: "200% 100%", animation: "shimmer 1.6s infinite",
    }} />
  );
}

function ErrorBanner({ msg, onRetry }) {
  return (
    <div style={{
      background: "rgba(255,74,74,0.08)", border: "1px solid rgba(255,74,74,0.2)",
      borderRadius: 10, padding: "12px 16px", marginBottom: 18,
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
    }}>
      <div>
        <div style={{ color: "#ff4a4a", fontWeight: 600, fontSize: 13, marginBottom: 2 }}>Error</div>
        <div style={{ color: "#888", fontSize: 12 }}>{msg}</div>
      </div>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: "rgba(255,74,74,0.15)", border: "1px solid rgba(255,74,74,0.3)",
          color: "#ff4a4a", borderRadius: 6, padding: "5px 11px", fontSize: 12, cursor: "pointer",
        }}>Retry</button>
      )}
    </div>
  );
}

// ─── ALIGNMENT RING ───────────────────────────────────────────────────────
function AlignmentRing({ score, size = 64 }) {
  const r = (size / 2) * 0.78;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 70 ? "#00e5a0" : score >= 45 ? "#ffd84a" : "#ff4a4a";
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease" }}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size*0.22} fontWeight="700" fontFamily="'DM Mono',monospace"
        style={{ transform:"rotate(90deg)", transformOrigin:`${size/2}px ${size/2}px` }}>
        {score}%
      </text>
    </svg>
  );
}

// ─── REP CARD ─────────────────────────────────────────────────────────────
function RepCard({ rep, onClick, selected, alignScore }) {
  const party = rep.partyName?.[0];
  const initials = (rep.name||"").split(",").reverse().join(" ").trim()
    .split(" ").map(w=>w[0]).filter(Boolean).join("").slice(0,2).toUpperCase()||"??";
  const chamber = rep.terms?.item?.[rep.terms.item.length-1]?.chamber||"";
  return (
    <div onClick={()=>onClick(rep)} style={{
      background: selected?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.025)",
      border:`1px solid ${selected?"rgba(255,255,255,0.18)":"rgba(255,255,255,0.07)"}`,
      borderRadius:12, padding:"16px 18px", cursor:"pointer",
      transition:"all 0.2s", display:"flex", alignItems:"center", gap:14,
    }}>
      <div style={{
        width:44, height:44, borderRadius:"50%", flexShrink:0,
        background:`linear-gradient(135deg,${partyColor(party)}33,${partyColor(party)}11)`,
        border:`2px solid ${partyColor(party)}55`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:15, fontWeight:700, color:partyColor(party), fontFamily:"'DM Mono',monospace",
      }}>{initials}</div>
      <div style={{flex:1, minWidth:0}}>
        <div style={{fontWeight:700,fontSize:14,color:"#f0f0f0",marginBottom:2}}>{rep.name}</div>
        <div style={{fontSize:12,color:"#777"}}>
          <span style={{color:partyColor(party)}}>{partyLabel(party)}</span>
          {chamber?` · ${chamber}`:""} · {rep.state}
        </div>
      </div>
      {alignScore!==undefined && <AlignmentRing score={alignScore} size={50}/>}
    </div>
  );
}

// ─── VOTE ROW ─────────────────────────────────────────────────────────────
function VoteRow({ vote, onVote }) {
  const [userVote, setUserVote] = useState(null);
  const repVoteStr = vote.memberVotes?.votePosition||"—";
  const isYea = ["Yes","Yea","Aye"].includes(repVoteStr);
  const match = userVote===null ? null : (userVote==="yea")===isYea;
  const handle = (v) => { setUserVote(v); onVote?.(v, isYea?"yea":"nay"); };
  const title = vote.bill?.title||vote.description||"—";
  const billId = vote.bill?`${(vote.bill.type||"").toUpperCase()} ${vote.bill.number}`:`Roll #${vote.rollNumber||"?"}`;
  return (
    <div style={{borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"14px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:180}}>
          <div style={{display:"flex",gap:7,marginBottom:4,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:10,background:"rgba(255,255,255,0.07)",color:"#999",
              padding:"2px 7px",borderRadius:4,fontFamily:"'DM Mono',monospace"}}>{billId}</span>
            <span style={{fontSize:11,color:"#555"}}>{vote.date||""}</span>
          </div>
          <div style={{fontWeight:500,fontSize:13,color:"#ddd",lineHeight:1.4}}>
            {title.length>110?title.slice(0,110)+"…":title}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={{fontSize:11,color:"#555"}}>Rep:</span>
            <span style={{fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace",
              color:isYea?"#00e5a0":repVoteStr==="—"?"#666":"#ff4a4a"}}>{repVoteStr}</span>
          </div>
          {userVote===null?(
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <span style={{fontSize:11,color:"#555"}}>You:</span>
              <button onClick={()=>handle("yea")} style={vBtn("#00e5a0")}>YEA</button>
              <button onClick={()=>handle("nay")} style={vBtn("#ff4a4a")}>NAY</button>
            </div>
          ):(
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace",
                color:match?"#00e5a0":"#ff4a4a"}}>{match?"✓ ALIGNED":"✗ DIVERGED"}</span>
              <button onClick={()=>setUserVote(null)} style={{
                background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:11}}>reset</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
const vBtn = (c)=>({
  background:`${c}15`,border:`1px solid ${c}55`,color:c,
  borderRadius:6,padding:"3px 8px",fontSize:11,
  fontFamily:"'DM Mono',monospace",fontWeight:700,cursor:"pointer",
});

// ─── FINANCE BAR ──────────────────────────────────────────────────────────
function FinanceBar({ label, amount, max }) {
  return (
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <div style={{fontSize:13,color:"#ccc"}}>{label}</div>
        <span style={{fontSize:13,color:"#f0f0f0",fontFamily:"'DM Mono',monospace"}}>{fmt(amount)}</span>
      </div>
      <div style={{background:"rgba(255,255,255,0.06)",borderRadius:4,height:4}}>
        <div style={{width:`${(amount/max)*100}%`,height:"100%",borderRadius:4,
          background:"linear-gradient(90deg,rgba(74,158,255,0.8),rgba(74,158,255,0.3))",
          transition:"width 0.8s ease"}}/>
      </div>
    </div>
  );
}

// ─── ORDER CARD ───────────────────────────────────────────────────────────
function OrderCard({ order }) {
  const [exp,setExp] = useState(false);
  return (
    <div onClick={()=>setExp(!exp)} style={{
      background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",
      borderRadius:10,padding:"13px 17px",marginBottom:8,cursor:"pointer",
    }}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:"#555",marginBottom:4,fontFamily:"'DM Mono',monospace"}}>
            {order.document_number} · {order.publication_date}
          </div>
          <div style={{fontWeight:600,fontSize:13,color:"#e0e0e0",lineHeight:1.4}}>{order.title}</div>
          {exp&&order.abstract&&(
            <div style={{fontSize:13,color:"#888",lineHeight:1.6,marginTop:8}}>{order.abstract}</div>
          )}
          {exp&&(
            <a href={order.html_url} target="_blank" rel="noreferrer"
              onClick={e=>e.stopPropagation()}
              style={{display:"inline-block",marginTop:8,fontSize:11,color:"#4a9eff",textDecoration:"none"}}>
              View on Federal Register →
            </a>
          )}
        </div>
        <div style={{color:"#555",fontSize:12,paddingTop:2,flexShrink:0}}>{exp?"▲":"▼"}</div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]                 = useState("reps");
  const [stateInput,setStateInput]   = useState("NH");
  const [state,setState]             = useState("NH");
  const [members,setMembers]         = useState([]);
  const [membersLoading,setML]       = useState(false);
  const [membersError,setME]         = useState(null);
  const [selectedRep,setSelectedRep] = useState(null);
  const [votes,setVotes]             = useState([]);
  const [votesLoading,setVL]         = useState(false);
  const [votesError,setVE]           = useState(null);
  const [finance,setFinance]         = useState(null);
  const [financeLoading,setFL]       = useState(false);
  const [financeError,setFE]         = useState(null);
  const [orders,setOrders]           = useState([]);
  const [ordersLoading,setOL]        = useState(false);
  const [ordersError,setOE]          = useState(null);
  const [loaded,setLoaded]           = useState(false);
  const [aligned,setAligned]         = useState(0);
  const [diverged,setDiverged]       = useState(0);

  useEffect(()=>{setTimeout(()=>setLoaded(true),80);},[]);

  const alignScore = aligned+diverged===0 ? null
    : Math.round((aligned/(aligned+diverged))*100);

  const handleVote = useCallback((userV,repV)=>{
    if(userV===repV) setAligned(a=>a+1); else setDiverged(d=>d+1);
  },[]);

  const loadMembers = useCallback(async(st)=>{
    setML(true); setME(null); setMembers([]); setSelectedRep(null);
    try {
      const data = await apiGet("/members",{state:st,limit:10});
      const list = data.members||[];
      setMembers(list);
      if(list[0]) setSelectedRep(list[0]);
    } catch(e){ setME(e.message); }
    setML(false);
  },[]);

  useEffect(()=>{ loadMembers("NH"); },[loadMembers]);

  const loadVotes = useCallback(async(id)=>{
    if(!id) return;
    setVL(true); setVE(null); setVotes([]);
    try {
      const data = await apiGet(`/votes/${id}`,{limit:20});
      setVotes(data.votes||[]);
    } catch(e){ setVE(e.message); }
    setVL(false);
  },[]);

  useEffect(()=>{
    if(selectedRep?.bioguideId) loadVotes(selectedRep.bioguideId);
  },[selectedRep,loadVotes]);

  const loadFinance = useCallback(async(name,st)=>{
    if(!name) return;
    setFL(true); setFE(null); setFinance(null);
    try {
      const data = await apiGet("/finance",{name,state:st});
      setFinance(data);
    } catch(e){ setFE(e.message); }
    setFL(false);
  },[]);

  useEffect(()=>{
    if(tab==="finance"&&selectedRep)
      loadFinance(selectedRep.name, selectedRep.state);
  },[tab,selectedRep,loadFinance]);

  const loadOrders = useCallback(async()=>{
    setOL(true); setOE(null);
    try {
      const data = await apiGet("/orders",{per_page:20});
      setOrders(data.results||[]);
    } catch(e){ setOE(e.message); }
    setOL(false);
  },[]);

  useEffect(()=>{
    if(tab==="orders"&&orders.length===0) loadOrders();
  },[tab,orders.length,loadOrders]);

  const search = ()=>{
    const st = stateInput.toUpperCase().trim();
    if(st.length===2){ setState(st); loadMembers(st); setAligned(0); setDiverged(0); }
  };

  const skeletons = (n,h)=>[...Array(n)].map((_,i)=><Skeleton key={i} height={h}/>);

  return (
    <div style={{
      minHeight:"100vh",background:"#0a0a0c",color:"#e0e0e0",
      fontFamily:"'DM Sans','Helvetica Neue',sans-serif",
      opacity:loaded?1:0,transition:"opacity 0.4s",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500;700&family=Playfair+Display:wght@700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}
        button:hover{opacity:0.8}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .fin{animation:fadeUp 0.3s ease forwards}
      `}</style>

      {/* Header */}
      <header style={{
        borderBottom:"1px solid rgba(255,255,255,0.07)",
        padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,
        position:"sticky",top:0,background:"rgba(10,10,12,0.95)",backdropFilter:"blur(12px)",zIndex:100,
      }}>
        <div style={{display:"flex",alignItems:"baseline",gap:10}}>
          <span style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:22,color:"#fff",letterSpacing:"-0.02em"}}>
            Ledger
          </span>
          <span style={{fontSize:10,color:"#444",fontFamily:"'DM Mono',monospace",letterSpacing:"0.14em"}}>
            PUBLIC RECORD
          </span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:"#666"}}>State</span>
          <input value={stateInput}
            onChange={e=>setStateInput(e.target.value.toUpperCase().slice(0,2))}
            onKeyDown={e=>e.key==="Enter"&&search()}
            style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:6,padding:"5px 8px",color:"#fff",fontSize:13,
              fontFamily:"'DM Mono',monospace",width:44,textAlign:"center",outline:"none"}}/>
          <button onClick={search} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",
            borderRadius:6,padding:"5px 10px",color:"#ccc",fontSize:12,cursor:"pointer"}}>Go</button>
          {alignScore!==null&&(
            <span style={{fontSize:11,color:"#00e5a0",background:"rgba(0,229,160,0.1)",
              borderRadius:20,padding:"3px 10px",fontFamily:"'DM Mono',monospace"}}>
              Alignment {alignScore}%
            </span>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div style={{display:"flex",padding:"0 24px",overflowX:"auto",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        {[
          {id:"reps",label:"Representatives"},
          {id:"votes",label:"Voting Record"},
          {id:"finance",label:"Campaign Finance"},
          {id:"orders",label:"Executive Orders"},
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            background:"none",border:"none",padding:"13px 15px",fontSize:13,
            fontWeight:tab===t.id?600:400,color:tab===t.id?"#fff":"#666",
            borderBottom:`2px solid ${tab===t.id?"#fff":"transparent"}`,
            cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      <main style={{maxWidth:820,margin:"0 auto",padding:"26px 24px"}}>

        {/* REPS */}
        {tab==="reps"&&(
          <div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#fff",marginBottom:4}}>Representatives</h2>
            <p style={{color:"#666",fontSize:13,marginBottom:18}}>
              Current members for <strong style={{color:"#aaa"}}>{state}</strong>. Alignment score appears once you cast votes.
            </p>
            {membersError&&<ErrorBanner msg={membersError} onRetry={()=>loadMembers(state)}/>}
            {membersLoading
              ? <div style={{display:"flex",flexDirection:"column",gap:10}}>{skeletons(3,72)}</div>
              : <div className="fin" style={{display:"flex",flexDirection:"column",gap:8}}>
                  {members.length===0&&!membersError&&<div style={{color:"#666",fontSize:13}}>No members found for "{state}".</div>}
                  {members.map(r=>(
                    <RepCard key={r.bioguideId} rep={r} onClick={setSelectedRep}
                      selected={selectedRep?.bioguideId===r.bioguideId}
                      alignScore={selectedRep?.bioguideId===r.bioguideId&&alignScore!==null?alignScore:undefined}/>
                  ))}
                </div>
            }
            {selectedRep&&!membersLoading&&(
              <div className="fin" style={{marginTop:18,background:"rgba(255,255,255,0.025)",
                border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14,gap:12}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:17,color:"#fff",marginBottom:3}}>{selectedRep.name}</div>
                    <div style={{fontSize:12,color:"#666"}}>
                      {partyLabel(selectedRep.partyName?.[0])} · {selectedRep.terms?.item?.[selectedRep.terms.item.length-1]?.chamber||"Congress"} · {selectedRep.state}
                    </div>
                  </div>
                  {alignScore!==null&&<AlignmentRing score={alignScore} size={64}/>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}>
                  {[["DISTRICT",selectedRep.district||"—"],["SINCE",selectedRep.terms?.item?.[0]?.startYear||"—"],["PARTY",selectedRep.partyName?.[0]||"—"]].map(([l,v])=>(
                    <div key={l} style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:10,color:"#666",marginBottom:3,letterSpacing:"0.06em"}}>{l}</div>
                      <div style={{fontSize:17,fontWeight:700,color:"#f0f0f0",fontFamily:"'DM Mono',monospace"}}>{v}</div>
                    </div>
                  ))}
                </div>
                {selectedRep.url&&(
                  <a href={selectedRep.url} target="_blank" rel="noreferrer"
                    style={{display:"inline-block",marginTop:12,fontSize:12,color:"#4a9eff",textDecoration:"none"}}>
                    Full profile on Congress.gov →
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* VOTES */}
        {tab==="votes"&&(
          <div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#fff",marginBottom:4}}>Voting Record</h2>
            <p style={{color:"#666",fontSize:13,marginBottom:18}}>
              Recent votes by <strong style={{color:"#aaa"}}>{selectedRep?.name||"select a rep first"}</strong>. Vote to track your alignment.
            </p>
            {!selectedRep&&<div style={{color:"#666",fontSize:13}}>← Select a representative first.</div>}
            {votesError&&<ErrorBanner msg={votesError} onRetry={()=>loadVotes(selectedRep?.bioguideId)}/>}
            {votesLoading
              ? <div style={{display:"flex",flexDirection:"column",gap:10}}>{skeletons(5,68)}</div>
              : <div className="fin">
                  {votes.length===0&&!votesError&&selectedRep&&<div style={{color:"#666",fontSize:13}}>No vote records returned.</div>}
                  {votes.map((v,i)=><VoteRow key={i} vote={v} onVote={handleVote}/>)}
                </div>
            }
          </div>
        )}

        {/* FINANCE */}
        {tab==="finance"&&(
          <div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#fff",marginBottom:4}}>Campaign Finance</h2>
            <p style={{color:"#666",fontSize:13,marginBottom:18}}>
              FEC data for <strong style={{color:"#aaa"}}>{selectedRep?.name||"—"}</strong>.
            </p>
            {!selectedRep&&<div style={{color:"#666",fontSize:13}}>← Select a representative first.</div>}
            {financeError&&<ErrorBanner msg={financeError}/>}
            {financeLoading
              ? <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{skeletons(2,76)}</div>
                  <Skeleton height={180}/>
                </div>
              : finance&&(
                <div className="fin">
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                    {[["TOTAL RAISED",fmt(finance.totals?.receipts)],["TOTAL SPENT",fmt(finance.totals?.disbursements)]].map(([l,v])=>(
                      <div key={l} style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"15px 17px"}}>
                        <div style={{fontSize:10,color:"#666",marginBottom:5,letterSpacing:"0.06em"}}>{l}</div>
                        <div style={{fontSize:24,fontWeight:700,color:"#f0f0f0",fontFamily:"'DM Mono',monospace"}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {finance.by_size?.length>0&&(
                    <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"17px 19px",marginBottom:14}}>
                      <div style={{fontSize:11,color:"#888",letterSpacing:"0.06em",marginBottom:12}}>CONTRIBUTIONS BY SIZE</div>
                      {finance.by_size.map((s,i)=>(
                        <FinanceBar key={i}
                          label={s.size===0?"Under $200 (unitemized)":`$${s.size.toLocaleString()}+`}
                          amount={s.total} max={Math.max(...finance.by_size.map(x=>x.total))}/>
                      ))}
                    </div>
                  )}
                  <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"15px 17px"}}>
                    <div style={{fontSize:11,color:"#888",letterSpacing:"0.06em",marginBottom:10}}>FEC RECORD</div>
                    {[["Office",finance.candidate?.office_full],["State",finance.candidate?.state],["Party",finance.candidate?.party_full]].map(([l,v])=>v&&(
                      <div key={l} style={{fontSize:13,color:"#aaa",marginBottom:4}}>
                        {l}: <span style={{color:"#e0e0e0"}}>{v}</span>
                      </div>
                    ))}
                    <a href={`https://www.fec.gov/data/candidate/${finance.candidate?.candidate_id}/`}
                      target="_blank" rel="noreferrer"
                      style={{display:"inline-block",marginTop:10,fontSize:12,color:"#4a9eff",textDecoration:"none"}}>
                      Full FEC record →
                    </a>
                  </div>
                </div>
              )
            }
          </div>
        )}

        {/* ORDERS */}
        {tab==="orders"&&(
          <div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#fff",marginBottom:4}}>Executive Orders</h2>
            <p style={{color:"#666",fontSize:13,marginBottom:18}}>Live from the Federal Register. Most recent first.</p>
            {ordersError&&<ErrorBanner msg={ordersError} onRetry={loadOrders}/>}
            {ordersLoading
              ? <div style={{display:"flex",flexDirection:"column",gap:8}}>{skeletons(5,58)}</div>
              : <div className="fin">
                  {orders.length===0&&!ordersError&&<div style={{color:"#666",fontSize:13}}>No orders loaded.</div>}
                  {orders.map((o,i)=><OrderCard key={i} order={o}/>)}
                </div>
            }
          </div>
        )}
      </main>

      <footer style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"16px 24px",textAlign:"center",
        color:"#333",fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:"0.05em"}}>
        DATA: CONGRESS.GOV · FEC.GOV · FEDERALREGISTER.GOV — ALL PUBLIC DOMAIN
      </footer>
    </div>
  );
}
