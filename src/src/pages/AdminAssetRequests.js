import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import { useNotifications } from "../context/NotificationContext";
import AssignAssetModal from "../components/AssignAssetModal";

const API = "https://haodaasset-backend-1.onrender.com";

const STATUS_CFG = {
  PENDING:  { label:"Pending",  bg:"#fffbeb", color:"#d97706", border:"#fde68a", dot:"#f59e0b" },
  APPROVED: { label:"Approved", bg:"#dcfce7", color:"#15803d", border:"#86efac", dot:"#16a34a" },
  REJECTED: { label:"Rejected", bg:"#fee2e2", color:"#b91c1c", border:"#fca5a5", dot:"#dc2626" },
};

const URGENCY_CFG = {
  Critical: { bg:"#fee2e2", color:"#b91c1c", border:"#fca5a5" },
  Urgent:   { bg:"#ffedd5", color:"#c2410c", border:"#fdba74" },
  Normal:   { bg:"#eff6ff", color:"#1d4ed8", border:"#bfdbfe" },
};

function StatusBadge({ status }) {
  const s = STATUS_CFG[status]||STATUS_CFG.PENDING;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 11px",borderRadius:999,background:s.bg,color:s.color,border:`1px solid ${s.border}`,fontSize:11.5,fontWeight:700}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:s.dot,flexShrink:0}}/>
      {s.label}
    </span>
  );
}

function UrgencyBadge({ urgency }) {
  const u = URGENCY_CFG[urgency]||URGENCY_CFG.Normal;
  return (
    <span style={{padding:"3px 9px",borderRadius:999,background:u.bg,color:u.color,border:`1px solid ${u.border}`,fontSize:11.5,fontWeight:700}}>
      {urgency==="Critical"?"🔴":urgency==="Urgent"?"🟡":"🔵"} {urgency}
    </span>
  );
}

function timeAgo(dateStr) {
  if(!dateStr) return "—";
  const d=new Date(dateStr);
  const diff=(Date.now()-d)/1000;
  if(diff<60) return "Just now";
  if(diff<3600) return `${Math.floor(diff/60)}m ago`;
  if(diff<86400) return `${Math.floor(diff/3600)}h ago`;
  return d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}

function initials(name){return(name||"?").split(" ").map((w)=>w[0]).join("").toUpperCase().slice(0,2);}
function avatarBg(name){const c=["#1a56db","#059669","#7c3aed","#b45309","#be185d"];return c[(name||"A").charCodeAt(0)%c.length];}

// ── Detail Drawer ─────────────────────────────────────────────────
function DetailDrawer({ request, onClose, onApprove, onReject, saving }) {
  if(!request) return null;
  const s = STATUS_CFG[request.status]||STATUS_CFG.PENDING;
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.35)",zIndex:400,backdropFilter:"blur(2px)"}}/>
      <div className="side-drawer" style={{
        position:"fixed",top:0,right:0,bottom:0,
        background:"#fff",zIndex:500,
        boxShadow:"-8px 0 40px rgba(0,0,0,0.14)",
        display:"flex",flexDirection:"column",
        animation:"slideRight 0.22s ease",
      }}>
        {/* Header */}
        <div style={{
          padding:"20px 24px",borderBottom:"1px solid var(--gray-100)",
          background:"var(--gray-50)",
          display:"flex",alignItems:"center",justifyContent:"space-between",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{
              width:40,height:40,borderRadius:10,flexShrink:0,
              background:avatarBg(request.employeeName),
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:15,fontWeight:700,color:"#fff",
            }}>
              {initials(request.employeeName)}
            </div>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:"var(--gray-900)"}}>Request #{request.id}</div>
              <div style={{fontSize:12,color:"var(--gray-400)",marginTop:1}}>{timeAgo(request.requestedAt)}</div>
            </div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:8,border:"1px solid var(--gray-200)",background:"#fff",cursor:"pointer",fontSize:16,color:"var(--gray-500)"}}>✕</button>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>
          {/* Badges */}
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            <StatusBadge status={request.status}/>
            <UrgencyBadge urgency={request.urgency}/>
          </div>

          {/* Sections */}
          {[
            {
              title:"Employee",
              rows:[["Employee ID",request.employeeId],["Full Name",request.employeeName]],
            },
            {
              title:"Request Details",
              rows:[
                ["Asset Type",request.assetType],
                ["Priority",request.urgency],
                ["Submitted",request.requestedAt?new Date(request.requestedAt).toLocaleString("en-IN"):"—"],
                ["Resolved",request.resolvedAt?new Date(request.resolvedAt).toLocaleString("en-IN"):"Pending"],
              ],
            },
          ].map(({title,rows})=>(
            <div key={title} style={{background:"#fff",border:"1px solid var(--gray-200)",borderRadius:10,marginBottom:14,overflow:"hidden"}}>
              <div style={{padding:"10px 16px",background:"var(--gray-50)",borderBottom:"1px solid var(--gray-100)",fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"var(--gray-400)"}}>
                {title}
              </div>
              {rows.map(([label,value])=>(
                <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 16px",borderBottom:"1px solid var(--gray-100)"}}>
                  <span style={{fontSize:12.5,color:"var(--gray-500)"}}>{label}</span>
                  <span style={{fontSize:12.5,fontWeight:600,color:"var(--gray-800)",textAlign:"right",maxWidth:230}}>{value||"—"}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Reason */}
          <div style={{background:"#fff",border:"1px solid var(--gray-200)",borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",background:"var(--gray-50)",borderBottom:"1px solid var(--gray-100)",fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",color:"var(--gray-400)"}}>
              Reason / Justification
            </div>
            <div style={{padding:"14px 16px",fontSize:13.5,color:"var(--gray-700)",lineHeight:1.65}}>
              {request.reason||"No reason provided."}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {request.status==="PENDING"&&(
          <div style={{padding:"16px 24px",borderTop:"1px solid var(--gray-100)",display:"flex",gap:10}}>
            <button
              className="btn btn-success"
              style={{flex:1,height:42,fontSize:14}}
              onClick={()=>onApprove(request.id)}
              disabled={saving}
            >
              {saving==="APPROVED"?"Approving…":"✓ Approve Request"}
            </button>
            <button
              className="btn btn-danger"
              style={{flex:1,height:42,fontSize:14}}
              onClick={()=>onReject(request.id)}
              disabled={saving}
            >
              {saving==="REJECTED"?"Rejecting…":"✕ Reject Request"}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes slideRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function AdminAssetRequests() {
  const toast = useToast();
  const { refresh: refreshNotifications } = useNotifications();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(null);

 const [showAssignModal, setShowAssignModal] = useState(false);
 const [selectedRequest, setSelectedRequest] = useState(null);

  const load = useCallback(()=>{
    setLoading(true);
    axios.get(`${API}/api/admin/requests`)
      .then((r)=>{setRequests(r.data);setError("");})
      .catch(()=>setError("Couldn't load asset requests. Is the API running on :8080?"))
      .finally(()=>setLoading(false));
  },[]);

  useEffect(()=>{load();},[load]);

  const updateStatus = useCallback(async(id,status)=>{
    setSaving(status);
    try{
      await axios.put(`${API}/api/admin/requests/${id}/status`,{status});
      setRequests((prev)=>prev.map((r)=>r.id===id?{...r,status,resolvedAt:new Date().toISOString()}:r));
      toast(`Request #${id} ${status.toLowerCase()} successfully.`,"success");
      setSelectedId(null);
      refreshNotifications();
    }catch(err){
      toast(err.response?.data?.message||`Couldn't ${status.toLowerCase()} request.`,"error");
    }finally{setSaving(null);}
  },[toast,refreshNotifications]);

  const approve = (id) => {
  const req = requests.find((r) => r.id === id);

  if (!req) {
    toast("Request not found.", "error");
    return;
  }

  setSelectedRequest(req);
  setShowAssignModal(true);
};

const handleAssigned = async () => {
  if (!selectedRequest) return;

  try {

    await updateStatus(selectedRequest.id, "APPROVED");

    toast(
      `Asset assigned successfully to ${selectedRequest.employeeName}`,
      "success"
    );

    setShowAssignModal(false);
    setSelectedRequest(null);

    load();

  } catch (err) {
    console.error(err);
  }
};

const reject =(id)=>updateStatus(id,"REJECTED");

  const counts=useMemo(()=>({
    ALL:requests.length,
    PENDING:requests.filter((r)=>r.status==="PENDING").length,
    APPROVED:requests.filter((r)=>r.status==="APPROVED").length,
    REJECTED:requests.filter((r)=>r.status==="REJECTED").length,
  }),[requests]);

  const filtered=useMemo(()=>
    requests
      .filter((r)=>statusFilter==="ALL"||r.status===statusFilter)
      .filter((r)=>urgencyFilter==="ALL"||r.urgency===urgencyFilter)
      .filter((r)=>
        (r.employeeId||"").toLowerCase().includes(search.toLowerCase())||
        (r.employeeName||"").toLowerCase().includes(search.toLowerCase())||
        (r.assetType||"").toLowerCase().includes(search.toLowerCase())||
        (r.reason||"").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a,b)=>new Date(b.requestedAt)-new Date(a.requestedAt)),
    [requests,statusFilter,urgencyFilter,search]
  );

  const selected=requests.find((r)=>r.id===selectedId)||null;

  return (
    <Layout
      title="Asset Requests"
      subtitle="Manage employee equipment requests"
      actions={<button className="btn btn-secondary" onClick={load} disabled={loading}>{loading?"Loading…":"↻ Refresh"}</button>}
    >
      {error&&(
        <div style={{marginBottom:20,borderRadius:10,padding:"12px 18px",background:"#fef2f2",border:"1px solid #fecaca",fontSize:13,color:"#991b1b"}}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI Strip — clickable filters */}
      <div className="kpi-row kpi-row-4" style={{marginBottom:22}}>
        {[
          {key:"ALL",      label:"Total Requests", color:"#1a56db", bg:"#eff6ff", icon:"📋"},
          {key:"PENDING",  label:"Pending",        color:"#d97706", bg:"#fffbeb", icon:"⏳"},
          {key:"APPROVED", label:"Approved",       color:"#15803d", bg:"#dcfce7", icon:"✅"},
          {key:"REJECTED", label:"Rejected",       color:"#b91c1c", bg:"#fee2e2", icon:"✕"},
        ].map((s)=>(
          <div
            key={s.key}
            onClick={()=>setStatusFilter(s.key)}
            style={{
              background:"#fff",
              border:`1px solid ${statusFilter===s.key?s.color+"60":"var(--gray-200)"}`,
              borderTop:`3px solid ${s.color}`,
              borderRadius:10,padding:"16px 18px",cursor:"pointer",
              transition:"all 0.15s",
              boxShadow:statusFilter===s.key?`0 0 0 3px ${s.color}18`:"var(--shadow-card)",
            }}
          >
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:20}}>{s.icon}</span>
              {s.key==="PENDING"&&counts.PENDING>0&&(
                <span style={{background:s.color,color:"#fff",fontSize:10,fontWeight:800,padding:"1px 7px",borderRadius:20}}>Action needed</span>
              )}
            </div>
            <div style={{fontSize:28,fontWeight:800,color:loading?"var(--gray-300)":s.color,lineHeight:1}}>{loading?"—":counts[s.key]}</div>
            <div style={{fontSize:11.5,fontWeight:600,color:"var(--gray-400)",marginTop:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="card">
        <div className="card-header" style={{flexWrap:"wrap",gap:10}}>
          <div>
            <div className="card-title">
              {statusFilter==="ALL"?"All Requests":`${STATUS_CFG[statusFilter]?.label} Requests`}
            </div>
            <div className="card-subtitle">
              {loading?"Loading…":`${filtered.length} request${filtered.length!==1?"s":""}`}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <select className="input" style={{width:130}} value={urgencyFilter} onChange={(e)=>setUrgencyFilter(e.target.value)}>
              <option value="ALL">All priorities</option>
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
              <option value="Critical">Critical</option>
            </select>
            <div style={{position:"relative"}}>
              <svg style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--gray-400)"}} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className="input" style={{paddingLeft:32,width:230}} placeholder="Search employee, type, reason…" value={search} onChange={(e)=>setSearch(e.target.value)}/>
              {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--gray-400)",fontSize:13}}>✕</button>}
            </div>
          </div>
        </div>

        {loading?(
          <div style={{textAlign:"center",padding:"64px 20px",color:"var(--gray-400)"}}>
            <div style={{fontSize:28,marginBottom:10}}>⏳</div>
            <div style={{fontSize:14,fontWeight:600}}>Loading requests…</div>
          </div>
        ):filtered.length===0?(
          <div style={{textAlign:"center",padding:"64px 20px"}}>
            <div style={{fontSize:44,marginBottom:12,opacity:0.35}}>📭</div>
            <div style={{fontSize:15,fontWeight:700,color:"var(--gray-600)",marginBottom:6}}>No requests found</div>
            <div style={{fontSize:13,color:"var(--gray-400)"}}>
              {statusFilter!=="ALL"||search?
                "Try changing the filter or clearing your search.":
                "When employees raise equipment requests, they'll appear here."}
            </div>
          </div>
        ):(
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{width:44}}>#</th>
                  <th>Employee</th>
                  <th>Asset Requested</th>
                  <th>Reason</th>
                  <th>Priority</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th style={{width:130}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r)=>(
                  <tr key={r.id} style={{cursor:"pointer"}} onClick={()=>setSelectedId(r.id)}>
                    <td style={{fontSize:11,color:"var(--gray-400)",fontFamily:"monospace"}}>#{r.id}</td>
                    <td>
                      <div style={{display:"flex",alignItems:"center",gap:9}}>
                        <div style={{width:32,height:32,borderRadius:8,background:avatarBg(r.employeeName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11.5,fontWeight:700,color:"#fff",flexShrink:0}}>
                          {initials(r.employeeName)}
                        </div>
                        <div>
                          <div style={{fontWeight:700,fontSize:13,color:"var(--gray-900)"}}>{r.employeeName}</div>
                          <div style={{fontSize:11,color:"var(--gray-400)",marginTop:1}}>{r.employeeId}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{display:"inline-block",padding:"3px 9px",borderRadius:6,background:"#eff6ff",color:"#1d4ed8",fontSize:12,fontWeight:700}}>
                        {r.assetType}
                      </span>
                    </td>
                    <td style={{maxWidth:180}}>
                      <span style={{display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",fontSize:12.5,color:"var(--gray-600)"}}>
                        {r.reason||"—"}
                      </span>
                    </td>
                    <td><UrgencyBadge urgency={r.urgency}/></td>
                    <td style={{fontSize:12.5,color:"var(--gray-400)",whiteSpace:"nowrap"}}>{timeAgo(r.requestedAt)}</td>
                    <td><StatusBadge status={r.status}/></td>
                    <td onClick={(e)=>e.stopPropagation()}>
                      <div style={{display:"flex",gap:6}}>
                        <button className="btn btn-secondary btn-sm" onClick={()=>setSelectedId(r.id)}>
                          👁 View
                        </button>
                        {r.status==="PENDING"&&(
                          <>
                            <button className="btn btn-success btn-sm" onClick={()=>approve(r.id)} disabled={saving!==null} title="Approve">✓</button>
                            <button className="btn btn-danger btn-sm" onClick={()=>reject(r.id)} disabled={saving!==null} title="Reject">✕</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DetailDrawer request={selected} onClose={()=>setSelectedId(null)} onApprove={approve} onReject={reject} saving={saving}/>
    <AssignAssetModal
    open={showAssignModal}
    request={selectedRequest}
    onClose={() => {
        setShowAssignModal(false);
        setSelectedRequest(null);
    }}
    onAssigned={handleAssigned}
/>
    </Layout>
  );
}

