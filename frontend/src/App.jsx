import { useState, useEffect, useCallback } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────
const API_BASE = "/api";

async function apiGet(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data;}

async function directGet(url, params = {}) {
  const u = new URL(url);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

async function apiPost(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data;
}

// ─── UTILITIES ────────────────────────────────────────────────────────────
const partyColor = (p) => p === "D" ? "#4a9eff" : p === "R" ? "#ff4a4a" : "#c084fc";

const billStatus = (action) => {
  if (!action) return null;
  const t = action.toLowerCase();
  if (t.includes("became public law") || t.includes("signed by the president")) return { label: "SIGNED INTO LAW", color: "#00e5a0" };
  if (t.includes("passed senate") && t.includes("passed house"))                 return { label: "PASSED BOTH", color: "#00e5a0" };
  if (t.includes("passed senate"))   return { label: "PASSED SENATE", color: "#4a9eff" };
  if (t.includes("passed house"))    return { label: "PASSED HOUSE",  color: "#4a9eff" };
  if (t.includes("failed of passage") || t.includes("failed to pass")) return { label: "FAILED", color: "#ff4a4a" };
  if (t.includes("vetoed"))          return { label: "VETOED", color: "#ff8c00" };
  if (t.includes("referred to"))     return { label: "IN COMMITTEE", color: "#666" };
  return null;
};
const partyLabel = (p) => p === "D" ? "Democrat" : p === "R" ? "Republican" : p || "Independent";
const parseName  = (desc) => desc ? desc.split(",")[0].trim() : "Unknown";
const parseRole  = (desc) => { if (!desc) return ""; const m = desc.match(/to be (.+)/i); return m ? m[1].trim() : ""; };
const PRESIDENT_PARTY = { "Ronald Reagan":"R","George H.W. Bush":"R","Bill Clinton":"D","George W. Bush":"R","Barack Obama":"D","Donald Trump":"R","Joe Biden":"D" };
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
  const [summary, setSummary]   = useState(null);

  const repVoteStr = vote.memberVotes?.votePosition||"—";
  const isYea = ["Yes","Yea","Aye"].includes(repVoteStr);
  const match = userVote===null ? null : (userVote==="yea")===isYea;
  const handle = (v) => { setUserVote(v); onVote?.(v, isYea?"yea":"nay"); };
  const rawTitle = vote.bill?.title||vote.description||"—";
  const billId = vote.bill?`${(vote.bill.type||"").toUpperCase()} ${vote.bill.number}`:`Roll #${vote.rollNumber||"?"}`;

  useEffect(() => {
    if (!vote.bill?.title) return;
    const id = `${vote.bill.type||""}${vote.bill.number||""}`;
    apiPost("/summarize", { title: vote.bill.title, bill_id: id })
      .then(d => { if (d.summary) setSummary(d.summary); })
      .catch(() => {});
  }, [vote.bill?.title]); // eslint-disable-line

  return (
    <div style={{borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"16px 0"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:180}}>
          <div style={{display:"flex",gap:7,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:10,background:"rgba(255,255,255,0.07)",color:"#999",
              padding:"2px 7px",borderRadius:4,fontFamily:"'DM Mono',monospace"}}>{billId}</span>
            <span style={{fontSize:11,color:"#555"}}>{vote.date||""}</span>
          </div>
          {summary
            ? <div style={{fontWeight:600,fontSize:14,color:"#fff",lineHeight:1.4,marginBottom:3}}>{summary}</div>
            : <div style={{fontWeight:500,fontSize:13,color:"#ddd",lineHeight:1.4}}>{rawTitle.length>110?rawTitle.slice(0,110)+"…":rawTitle}</div>
          }
          {summary && <div style={{fontSize:11,color:"#555",lineHeight:1.4}}>{rawTitle.length>90?rawTitle.slice(0,90)+"…":rawTitle}</div>}
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

// ─── VOTE BUBBLE ──────────────────────────────────────────────────────────
function VoteBubble({ label, count, color }) {
  return (
    <div style={{background:`${color}12`,border:`1px solid ${color}33`,borderRadius:8,padding:"7px 13px",textAlign:"center",minWidth:60}}>
      <div style={{fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace",color}}>{count}</div>
      <div style={{fontSize:9,color:"#555",letterSpacing:"0.07em",marginTop:1}}>{label}</div>
    </div>
  );
}

// ─── BILL CARD ────────────────────────────────────────────────────────────
function BillCard({ bill, repVote, userVote, onVote }) {
  const [exp,setExp]         = useState(false);
  const [detail,setDetail]   = useState(null);
  const [detailLoading,setDL] = useState(false);

  const billId    = `${bill.type}${bill.number}`;
  const billLabel = `${(bill.type||"").toUpperCase()} ${bill.number}`;
  const title     = bill.title || billLabel;
  const action    = bill.latestAction?.text || "";
  const date      = bill.latestAction?.actionDate || "";
  const sponsor   = bill.sponsors?.[0]?.fullName || bill.sponsors?.[0]?.name || "";
  const sparty    = bill.sponsors?.[0]?.party || "";
  const match     = (userVote && repVote) ? userVote === repVote : null;
  const status    = billStatus(action);
  const claudeUrl = `https://claude.ai/new?q=${encodeURIComponent(
    `Explain this bill in plain terms: ${billLabel} - "${title}". What does it do, who does it affect, and what are the main arguments for and against?`
  )}`;

  const toggleExpand = async () => {
    const next = !exp;
    setExp(next);
    if (next && !detail && !detailLoading) {
      setDL(true);
      try {
        const d = await apiGet("/bill-detail", { congress: bill.congress || "119", type: bill.type, number: bill.number });
        setDetail(d);
      } catch (_) { setDetail({}); }
      setDL(false);
    }
  };

  return (
    <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"16px 18px",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:180}}>
          <div style={{display:"flex",gap:7,marginBottom:6,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:10,background:"rgba(255,255,255,0.07)",color:"#999",padding:"2px 7px",borderRadius:4,fontFamily:"'DM Mono',monospace"}}>{billLabel}</span>
            {date&&<span style={{fontSize:11,color:"#555"}}>{date}</span>}
            {sponsor&&<span style={{fontSize:11,color:partyColor(sparty)}}>{sponsor}</span>}
            {status&&<span style={{fontSize:10,color:status.color,background:`${status.color}18`,border:`1px solid ${status.color}44`,borderRadius:4,padding:"1px 6px",fontFamily:"'DM Mono',monospace",letterSpacing:"0.04em"}}>{status.label}</span>}
          </div>
          <div style={{fontWeight:600,fontSize:14,color:"#fff",lineHeight:1.4,marginBottom:5}}>
            {title.length>130?title.slice(0,130)+"…":title}
          </div>
          {!exp&&action&&<div style={{fontSize:12,color:"#555",lineHeight:1.4}}>{action.length>110?action.slice(0,110)+"…":action}</div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
          {repVote&&(
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <span style={{fontSize:11,color:"#555"}}>Rep:</span>
              <span style={{fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace",color:repVote==="yea"?"#00e5a0":"#ff4a4a"}}>{repVote.toUpperCase()}</span>
            </div>
          )}
          {!userVote?(
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              <span style={{fontSize:11,color:"#555"}}>You:</span>
              <button onClick={e=>{e.stopPropagation();onVote(billId,"yea");}} style={vBtn("#00e5a0")}>YEA</button>
              <button onClick={e=>{e.stopPropagation();onVote(billId,"nay");}} style={vBtn("#ff4a4a")}>NAY</button>
            </div>
          ):(
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {match!==null&&<span style={{fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace",color:match?"#00e5a0":"#ff4a4a"}}>{match?"✓ ALIGNED":"✗ DIVERGED"}</span>}
              <span style={{fontSize:12,color:userVote==="yea"?"#00e5a0":"#ff4a4a",fontFamily:"'DM Mono',monospace"}}>You: {userVote.toUpperCase()}</span>
              <button onClick={e=>{e.stopPropagation();onVote(billId,null);}} style={{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:11}}>reset</button>
            </div>
          )}
          <button onClick={toggleExpand} style={{background:"none",border:"none",color:"#555",fontSize:11,cursor:"pointer",padding:"2px 0",letterSpacing:"0.03em"}}>
            {exp?"less ▲":"details ▼"}
          </button>
        </div>
      </div>
      {exp&&(
        <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          {detailLoading&&<Skeleton height={60}/>}
          {detail?.summary&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:"#555",letterSpacing:"0.07em",marginBottom:6}}>PLAIN SUMMARY (CRS)</div>
              <div style={{fontSize:13,color:"#bbb",lineHeight:1.75}}>
                {detail.summary.length>600?detail.summary.slice(0,600)+"…":detail.summary}
              </div>
            </div>
          )}
          {detail?.voteTotals&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,color:"#555",letterSpacing:"0.07em",marginBottom:8}}>
                {detail.voteTotals.voteType?detail.voteTotals.voteType.toUpperCase():"FLOOR VOTE"} — HOW CONGRESS VOTED
                {detail.voteTotals.result&&<span style={{color:"#888",marginLeft:8}}>· {detail.voteTotals.result}</span>}
              </div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <VoteBubble label="YEA" count={detail.voteTotals.yea} color="#00e5a0"/>
                <VoteBubble label="NAY" count={detail.voteTotals.nay} color="#ff4a4a"/>
                {detail.voteTotals.notVoting>0&&<VoteBubble label="NOT VOTING" count={detail.voteTotals.notVoting} color="#555"/>}
              </div>
            </div>
          )}
          {!detailLoading&&detail&&!detail.summary&&!detail.voteTotals&&(
            <div style={{fontSize:12,color:"#555",marginBottom:10}}>No CRS summary or recorded vote available yet.</div>
          )}
          <a href={claudeUrl} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#4a9eff",textDecoration:"none"}}>Ask Claude for a plain-language summary →</a>
        </div>
      )}
    </div>
  );
}

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

// ─── JUSTICE CARD ─────────────────────────────────────────────────────────
function JusticeCard({ justice }) {
  const scotusRole = (justice.roles||[]).filter(r=>r.institution_name?.includes("Supreme Court")).at(-1);
  const name      = justice.name||"Unknown";
  const roleTitle = scotusRole?.role_title||"Associate Justice";
  const president = scotusRole?.appointing_president||"Unknown";
  const yearStart = scotusRole?.date_start ? new Date(scotusRole.date_start*1000).getFullYear() : "—";
  const party     = PRESIDENT_PARTY[president]||"I";
  const isChief   = roleTitle.toLowerCase().includes("chief");
  const initials  = name.split(" ").filter(w=>w&&/[A-Z]/.test(w[0])).map(w=>w[0]).join("").slice(0,2).toUpperCase()||"??";
  return (
    <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:42,height:42,borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,${partyColor(party)}33,${partyColor(party)}11)`,border:`2px solid ${partyColor(party)}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:partyColor(party),fontFamily:"'DM Mono',monospace"}}>{initials}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:700,fontSize:14,color:"#f0f0f0",marginBottom:2,display:"flex",alignItems:"center",gap:7}}>
          {name}
          {isChief&&<span style={{fontSize:9,color:"#ffd84a",background:"rgba(255,216,74,0.12)",border:"1px solid rgba(255,216,74,0.25)",borderRadius:4,padding:"1px 6px",letterSpacing:"0.05em"}}>CHIEF</span>}
        </div>
        <div style={{fontSize:12,color:"#666"}}>Appointed by <span style={{color:partyColor(party)}}>{president}</span><span style={{color:"#444"}}> · {yearStart}</span></div>
      </div>
    </div>
  );
}

// ─── CASE CARD ────────────────────────────────────────────────────────────
function CaseCard({ kase }) {
  const [exp,setExp] = useState(false);
  const decided    = (kase.timeline||[]).find(t=>t.event==="Decided");
  const decidedDate = decided?.dates?.[0] ? new Date(decided.dates[0]*1000).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}) : null;
  const oyezUrl    = (kase.href||"").replace("api.oyez.org","www.oyez.org");
  const decision   = kase.decisions?.[0];
  const voteStr    = (decision?.majority_vote!=null&&decision?.minority_vote!=null) ? `${decision.majority_vote}–${decision.minority_vote}` : null;
  const winner     = decision?.winning_party || null;
  const resultDesc = decision?.description || null;
  return (
    <div onClick={()=>setExp(!exp)} style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"13px 17px",marginBottom:8,cursor:"pointer"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:"#555",marginBottom:4,fontFamily:"'DM Mono',monospace",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <span>{kase.docket_number}{decidedDate?` · Decided ${decidedDate}`:""}</span>
            {voteStr&&<span style={{color:"#ffd84a",background:"rgba(255,216,74,0.1)",border:"1px solid rgba(255,216,74,0.2)",borderRadius:4,padding:"1px 6px"}}>{voteStr}</span>}
          </div>
          <div style={{fontWeight:600,fontSize:13,color:"#e0e0e0",lineHeight:1.4}}>{kase.name}</div>
          {winner&&<div style={{fontSize:12,color:"#888",marginTop:3}}>Decided in favor of: <span style={{color:"#ccc"}}>{winner}</span></div>}
          {exp&&resultDesc&&<div style={{fontSize:13,color:"#777",lineHeight:1.6,marginTop:8,fontStyle:"italic"}}>{resultDesc}</div>}
          {exp&&kase.description&&<div style={{fontSize:13,color:"#888",lineHeight:1.6,marginTop:6}}>{kase.description}</div>}
          {exp&&oyezUrl&&<a href={oyezUrl} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{display:"inline-block",marginTop:8,fontSize:11,color:"#4a9eff",textDecoration:"none"}}>Full case on Oyez →</a>}
        </div>
        <div style={{color:"#555",fontSize:12,paddingTop:2,flexShrink:0}}>{exp?"▲":"▼"}</div>
      </div>
    </div>
  );
}

// ─── CABINET CARD ─────────────────────────────────────────────────────────
function CabinetCard({ nomination }) {
  const name = parseName(nomination.description);
  const role = parseRole(nomination.description);
  const org  = nomination.organization||"";
  const date = nomination.receivedDate||"";
  return (
    <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"14px 18px"}}>
      <div style={{fontWeight:700,fontSize:14,color:"#f0f0f0",marginBottom:3}}>{name}</div>
      <div style={{fontSize:13,color:"#4a9eff",marginBottom:org&&role?2:0}}>{role||org}</div>
      {org&&role&&<div style={{fontSize:12,color:"#555",marginBottom:3}}>{org}</div>}
      {date&&<div style={{fontSize:10,color:"#444",fontFamily:"'DM Mono',monospace",marginTop:4}}>CONFIRMED · {date}</div>}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,setTab]                 = useState("feed");
  const [stateInput,setStateInput]   = useState("");
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
  const [justices,setJustices]         = useState([]);
  const [justicesLoading,setJL]        = useState(false);
  const [justicesError,setJE]          = useState(null);
  const [cases,setCases]               = useState([]);
  const [casesLoading,setCasesL]       = useState(false);
  const [casesError,setCasesE]         = useState(null);
  const [scotusTerm,setScotusTerm]     = useState("2024");
  const [cabinet,setCabinet]           = useState([]);
  const [cabinetLoading,setCabL]       = useState(false);
  const [cabinetError,setCabE]         = useState(null);
  const [bills,setBills]               = useState([]);
  const [billsLoading,setBillsL]       = useState(false);
  const [billsError,setBillsE]         = useState(null);
  const [userVotes,setUserVotes]       = useState({});
  const [repVotesMap,setRepVotesMap]   = useState({});
  const [loaded,setLoaded]             = useState(false);
  const [copied,setCopied]             = useState(false);

  useEffect(()=>{setTimeout(()=>setLoaded(true),80);},[]);

  const votedBillIds  = Object.keys(userVotes);
  const matchedIds    = votedBillIds.filter(id=>repVotesMap[id]);
  const alignedCount  = matchedIds.filter(id=>userVotes[id]===repVotesMap[id]).length;
  const alignScore    = matchedIds.length===0 ? null : Math.round((alignedCount/matchedIds.length)*100);

  const copyAlignment = () => {
    if (alignScore===null||!selectedRep) return;
    const repName = (selectedRep.name||"").split(",").reverse().join(" ").trim();
    navigator.clipboard.writeText(`I align with ${repName} on ${alignScore}% of votes. Check yours at congresstruth.app`);
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };

  const handleBillVote = useCallback((billId, vote) => {
    setUserVotes(prev => {
      if (vote===null) { const n={...prev}; delete n[billId]; return n; }
      return {...prev,[billId]:vote};
    });
  },[]);

  const loadBills = useCallback(async()=>{
    setBillsL(true); setBillsE(null);
    try {
      const data = await apiGet("/bills",{limit:20});
      setBills(data.bills||[]);
    } catch(e){ setBillsE(e.message); }
    setBillsL(false);
  },[]);

  useEffect(()=>{ loadBills(); },[loadBills]);

  const loadMembers = useCallback(async(query)=>{
    setML(true); setME(null); setMembers([]); setSelectedRep(null);
    setRepVotesMap({}); setUserVotes({});
    try {
      const isZip = /^\d{5}$/.test(query.trim());
      const params = isZip ? {zip:query.trim(),limit:10} : {state:query.toUpperCase().trim(),limit:10};
      const data = await apiGet("/members",params);
      const list = data.members||[];
      setMembers(list);
      if(list[0]) setSelectedRep(list[0]);
      if(list.length===0) setME("No members found. Try a different state or ZIP.");
    } catch(e){ setME(e.message); }
    setML(false);
  },[]);

  const loadVotes = useCallback(async(id)=>{
    if(!id) return;
    setVL(true); setVE(null); setVotes([]);
    try {
      const data = await apiGet("/votes",{bioguide_id:id,limit:20});
      const list = data.votes||[];
      setVotes(list);
      const map={};
      list.forEach(v=>{
        if(v.bill?.type&&v.bill?.number){
          const key=`${v.bill.type}${v.bill.number}`;
          const pos=v.memberVotes?.votePosition||"";
          map[key]=["Yes","Yea","Aye"].includes(pos)?"yea":"nay";
        }
      });
      setRepVotesMap(map);
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
      const data = await apiGet("/orders");
      setOrders(data.results||[]);
    } catch(e){ setOE(e.message); }
    setOL(false);
  },[]);

  useEffect(()=>{
    if(tab==="orders"&&orders.length===0) loadOrders();
  },[tab,orders.length,loadOrders]);

  const loadJustices = useCallback(async()=>{
    setJL(true); setJE(null);
    try {
      const d = await directGet("https://api.oyez.org/justices");
      const current = (Array.isArray(d)?d:[]).filter(j=>{
        const r=(j.roles||[]).filter(r=>r.institution_name?.includes("Supreme Court")).at(-1);
        return r&&r.end_date===null;
      });
      setJustices(current);
    } catch(e){ setJE(e.message); }
    setJL(false);
  },[]);

  const loadCases = useCallback(async(term)=>{
    setCasesL(true); setCasesE(null); setCases([]);
    try {
      const d = await directGet("https://api.oyez.org/cases",{filter:`term:${term}`,per_page:20});
      setCases(Array.isArray(d)?d:[]);
    } catch(e){ setCasesE(e.message); }
    setCasesL(false);
  },[]);

  const loadCabinet = useCallback(async()=>{
    setCabL(true); setCabE(null);
    try { const d = await apiGet("/cabinet"); setCabinet(d.nominations||[]); }
    catch(e){ setCabE(e.message); }
    setCabL(false);
  },[]);

  useEffect(()=>{ if(tab==="scotus"&&justices.length===0) loadJustices(); },[tab,justices.length,loadJustices]);
  useEffect(()=>{ if(tab==="scotus") loadCases(scotusTerm); },[tab,scotusTerm,loadCases]);
  useEffect(()=>{ if(tab==="cabinet"&&cabinet.length===0) loadCabinet(); },[tab,cabinet.length,loadCabinet]);

  const search = ()=>{
    const q = stateInput.trim();
    if(q.length===2||/^\d{5}$/.test(q)){ setState(q.toUpperCase()); loadMembers(q); }
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
            CongressTruth
          </span>
          <span style={{fontSize:10,color:"#333",fontFamily:"'DM Mono',monospace",letterSpacing:"0.12em"}}>
            NO ADS · OPEN DATA
          </span>
        </div>
        {alignScore!==null&&(
          <button onClick={copyAlignment} title="Click to copy shareable score" style={{
            fontSize:11,color:copied?"#fff":"#00e5a0",cursor:"pointer",
            background:copied?"rgba(0,229,160,0.2)":"rgba(0,229,160,0.1)",
            border:`1px solid ${copied?"rgba(0,229,160,0.4)":"rgba(0,229,160,0.2)"}`,
            borderRadius:20,padding:"4px 12px",fontFamily:"'DM Mono',monospace",transition:"all 0.2s",
          }}>{copied ? "Copied!" : `Alignment ${alignScore}%`}</button>
        )}
      </header>

      {/* Tabs */}
      <div style={{display:"flex",padding:"0 24px",overflowX:"auto",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        {[
          {id:"feed",label:"Bills & Votes"},
          {id:"reps",label:"Representatives"},
          {id:"finance",label:"Campaign Finance"},
          {id:"orders",label:"Executive Orders"},
          {id:"scotus",label:"Supreme Court"},
          {id:"cabinet",label:"Cabinet"},
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
        {/* FEED */}
        {tab==="feed"&&(
          <div>
            {/* Rep Tracker Card */}
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.09)",borderRadius:14,padding:"16px 20px",marginBottom:22}}>
              <div style={{fontSize:10,color:"#555",letterSpacing:"0.08em",marginBottom:8}}>TRACK YOUR REP</div>
              <div style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:10}}>
                <input value={stateInput}
                  onChange={e=>setStateInput(e.target.value.slice(0,10))}
                  onKeyDown={e=>e.key==="Enter"&&search()}
                  placeholder="State (CA) or ZIP"
                  style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",
                    borderRadius:8,padding:"8px 12px",color:"#fff",fontSize:13,
                    fontFamily:"'DM Mono',monospace",width:160,outline:"none"}}/>
                <button onClick={search} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.14)",
                  borderRadius:8,padding:"8px 18px",color:"#ccc",fontSize:13,cursor:"pointer"}}>Find My Rep</button>
                {membersLoading&&<span style={{fontSize:12,color:"#555"}}>Loading…</span>}
                {membersError&&<span style={{fontSize:12,color:"#ff4a4a"}}>{membersError}</span>}
                {selectedRep&&!membersLoading&&(
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 14px",background:"rgba(255,255,255,0.04)",borderRadius:8,border:"1px solid rgba(255,255,255,0.08)"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",background:`${partyColor(selectedRep.partyName?.[0])}22`,border:`1.5px solid ${partyColor(selectedRep.partyName?.[0])}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:partyColor(selectedRep.partyName?.[0]),fontFamily:"'DM Mono',monospace"}}>
                      {(selectedRep.name||"").split(",").reverse().join(" ").trim().split(" ").map(w=>w[0]).filter(Boolean).join("").slice(0,2).toUpperCase()||"??"}
                    </div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#f0f0f0"}}>{selectedRep.name}</div>
                      <div style={{fontSize:11,color:"#666"}}>{partyLabel(selectedRep.partyName?.[0])} · {selectedRep.state}</div>
                    </div>
                    {alignScore!==null&&<AlignmentRing score={alignScore} size={44}/>}
                  </div>
                )}
                {members.length>1&&!membersLoading&&(
                  <select onChange={e=>{const r=members.find(m=>m.bioguideId===e.target.value);if(r)setSelectedRep(r);}} value={selectedRep?.bioguideId||""} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,color:"#ccc",fontSize:12,padding:"6px 10px",outline:"none",cursor:"pointer"}}>
                    {members.map(m=><option key={m.bioguideId} value={m.bioguideId}>{m.name}</option>)}
                  </select>
                )}
              </div>
            </div>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:14}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#fff"}}>Recent Bills</h2>
              <span style={{fontSize:12,color:"#444"}}>Vote YES or NO · compare with your rep</span>
            </div>
            {billsError&&<ErrorBanner msg={billsError} onRetry={loadBills}/>}
            {billsLoading
              ? <div style={{display:"flex",flexDirection:"column",gap:10}}>{skeletons(8,90)}</div>
              : <div className="fin">
                  {bills.length===0&&!billsError&&<div style={{color:"#666",fontSize:13}}>No bills loaded.</div>}
                  {bills.map(bill=>{
                    const billId=`${bill.type}${bill.number}`;
                    return <BillCard key={billId} bill={bill} repVote={repVotesMap[billId]} userVote={userVotes[billId]} onVote={handleBillVote}/>;
                  })}
                </div>
            }
          </div>
        )}

        {tab==="reps"&&(
          <div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#fff",marginBottom:4}}>Representatives</h2>
            <p style={{color:"#666",fontSize:13,marginBottom:18}}>
              Current members for <strong style={{color:"#aaa"}}>{state}</strong>. Search your state on the Bills tab to compare votes.
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

        {/* SUPREME COURT */}
        {tab==="scotus"&&(
          <div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#fff",marginBottom:4}}>Supreme Court</h2>
            <p style={{color:"#666",fontSize:13,marginBottom:18}}>Current justices and recent decisions. Source: Oyez.org.</p>
            <div style={{fontSize:11,color:"#555",letterSpacing:"0.06em",marginBottom:10}}>CURRENT JUSTICES</div>
            {justicesError&&<ErrorBanner msg={justicesError} onRetry={loadJustices}/>}
            {justicesLoading
              ? <div style={{display:"flex",flexDirection:"column",gap:8}}>{skeletons(9,66)}</div>
              : <div className="fin" style={{display:"flex",flexDirection:"column",gap:8,marginBottom:28}}>
                  {justices.length===0&&!justicesError&&<div style={{color:"#666",fontSize:13}}>No justices loaded.</div>}
                  {justices.map(j=><JusticeCard key={j.href||j.name} justice={j}/>)}
                </div>
            }
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:11,color:"#555",letterSpacing:"0.06em"}}>RECENT DECISIONS</div>
              <select value={scotusTerm} onChange={e=>setScotusTerm(e.target.value)} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,color:"#ccc",fontSize:12,padding:"4px 8px",outline:"none",cursor:"pointer"}}>
                {["2024","2023","2022","2021"].map(t=><option key={t} value={t}>{t} Term</option>)}
              </select>
            </div>
            {casesError&&<ErrorBanner msg={casesError} onRetry={()=>loadCases(scotusTerm)}/>}
            {casesLoading
              ? <div style={{display:"flex",flexDirection:"column",gap:8}}>{skeletons(5,56)}</div>
              : <div className="fin">
                  {cases.length===0&&!casesError&&<div style={{color:"#666",fontSize:13}}>No cases loaded for this term.</div>}
                  {cases.map((c,i)=><CaseCard key={c.docket_number||i} kase={c}/>)}
                </div>
            }
          </div>
        )}

        {/* CABINET */}
        {tab==="cabinet"&&(
          <div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:"#fff",marginBottom:4}}>Cabinet</h2>
            <p style={{color:"#666",fontSize:13,marginBottom:18}}>Senate-confirmed executive nominations, 119th Congress. Source: Congress.gov.</p>
            {cabinetError&&<ErrorBanner msg={cabinetError} onRetry={loadCabinet}/>}
            {cabinetLoading
              ? <div style={{display:"flex",flexDirection:"column",gap:8}}>{skeletons(8,68)}</div>
              : <div className="fin" style={{display:"flex",flexDirection:"column",gap:8}}>
                  {cabinet.length===0&&!cabinetError&&<div style={{color:"#666",fontSize:13}}>No cabinet members loaded.</div>}
                  {cabinet.map((n,i)=><CabinetCard key={n.citation||i} nomination={n}/>)}
                </div>
            }
          </div>
        )}

      </main>

      <footer style={{borderTop:"1px solid rgba(255,255,255,0.05)",padding:"20px 24px",textAlign:"center",
        color:"#2a2a2a",fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:"0.05em",lineHeight:1.9}}>
        <div>NO POLITICAL ADVERTISING · NO CORPORATE FUNDING · NO EDITORIAL OPINION</div>
        <div>DATA: CONGRESS.GOV · FEC.GOV · FEDERALREGISTER.GOV · OYEZ.ORG — ALL PUBLIC DOMAIN</div>
      </footer>
    </div>
  );
}
