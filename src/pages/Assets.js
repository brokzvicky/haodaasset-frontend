import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import {
  LayoutGrid, CheckCircle2, UserCheck, Archive, Wrench, AlertTriangle,
  Search, X, RotateCcw, Trash2, Undo2, Plus, PackageSearch, PackageX,
} from "lucide-react";
import Layout from "../components/Layout";
import StatusPill from "../components/StatusPill";
import { useToast } from "../utils/Toast";
import useCountUp from "../hooks/useCountUp";
import "./Assets.css";

const API = "https://haodaasset-backend-1.onrender.com";

const ASSET_STATUSES = ["Available","Assigned","Spare","Under Repair","Faulty","Lost","Retired","Disposed"];
const ASSET_CONDITIONS = ["New","Excellent","Good","Fair","Faulty","Damaged"];
const ASSET_TYPES = ["Laptop","Desktop","Monitor","Keyboard","Mouse","Headset","Mobile","Tablet","Printer","Server","Network Device","Other"];

const EMPTY_FORM = {
  assetType:"", laptopName:"", brand:"", model:"", serialNumber:"",
  location:"", assetStatus:"Available", assetCondition:"New",
  purchaseDate:"", warrantyExpiry:"", vendor:"", assetCost:"", remarks:"",
};

// ── Condition colour mapping ──────────────────────────────────
const conditionStyles = {
  "New":        { bg: "#dcfce7", border: "#22c55e", text: "#166534" },
  "Excellent":  { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  "Good":       { bg: "#f3e8ff", border: "#8b5cf6", text: "#5b21b6" },
  "Fair":       { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  "Faulty":     { bg: "#fee2e2", border: "#ef4444", text: "#991b1b" },
  "Damaged":    { bg: "#f3f4f6", border: "#6b7280", text: "#374151" }
};

// ── Premium gradient KPI/filter card ──────────────────────────────
const AssetKpiCard = ({ icon, label, value, gradA, gradB, glow, active, loading, onClick }) => {
  const count = useCountUp(loading ? 0 : value, 800);
  return (
    <div
      className={`kpi-card clickable${active ? " kpi-active" : ""}`}
      onClick={onClick}
      style={{ "--kpi-a": gradA, "--kpi-b": gradB, "--kpi-glow": glow }}
    >
      <div className="kpi-icon-wrapper">{icon}</div>
      <div className="kpi-value">{loading ? "—" : count}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
};

// ── Skeleton loader ──────────────────────────────────────────────
const SkeletonRow = () => {
  const cell = (w = 80) => (
    <td>
      <div style={{
        height:14, borderRadius:6,
        background:"linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
        backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite",
        width:w
      }} />
    </td>
  );
  return <tr>{cell(30)}{cell(100)}{cell(70)}{cell(90)}{cell(80)}{cell(60)}{cell(70)}{cell(80)}{cell(90)}</tr>;
};

// ── Return Dialog (Modal) ────────────────────────────────────────
const ReturnDialog = ({ asset, onClose, onConfirm, saving }) => {
  const [condition, setCondition] = useState("Good");
  const [nextStatus, setNextStatus] = useState("Available");
  if (!asset) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position:"fixed", inset:0,
          background:"rgba(15,23,42,0.5)",
          zIndex:800,
          backdropFilter:"blur(6px)",
          animation:"fadeIn 0.2s ease",
        }}
      />
      <div style={{
        position:"fixed", top:"50%", left:"50%",
        transform:"translate(-50%, -50%)",
        background:"#fff",
        borderRadius:16,
        width:440, maxWidth:"90vw",
        zIndex:900,
        boxShadow:"0 24px 64px rgba(0,0,0,0.2)",
        overflow:"hidden",
        animation:"scaleIn 0.2s ease",
      }}>
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"18px 24px",
          borderBottom:"1px solid var(--gray-100)",
        }}>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:"var(--gray-900)" }}>
              Return Asset
            </div>
            <div style={{ fontSize:13, color:"var(--gray-500)", marginTop:2 }}>
              {asset.laptopName} · SN: {asset.serialNumber}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width:32, height:32, borderRadius:8,
              border:"1px solid var(--gray-200)",
              background:"#fff",
              cursor:"pointer", color:"var(--gray-400)",
              transition:"0.15s",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding:"24px", display:"flex", flexDirection:"column", gap:18 }}>
          <div>
            <label style={{ fontSize:13, fontWeight:600, color:"var(--gray-700)", display:"block", marginBottom:6 }}>
              Returned Condition
            </label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
              {["Excellent","Good","Fair","Faulty","Damaged"].map(c => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  style={{
                    padding:"8px 4px", borderRadius:8,
                    fontSize:12, fontWeight:600,
                    border: condition === c ? "2px solid var(--primary)" : "1px solid var(--gray-200)",
                    background: condition === c ? "var(--primary-50)" : "#fff",
                    color: condition === c ? "var(--primary)" : "var(--gray-600)",
                    cursor:"pointer", transition:"0.12s",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize:13, fontWeight:600, color:"var(--gray-700)", display:"block", marginBottom:6 }}>
              Move Asset To
            </label>
            <select
              className="input"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
              style={{ width:"100%" }}
            >
              <option value="Available">Available — Ready to reassign</option>
              <option value="Spare">Spare — Keep in reserve</option>
              <option value="Under Repair">Under Repair — Send for servicing</option>
              <option value="Faulty">Faulty — Flag as defective</option>
              <option value="Retired">Retired — End of life</option>
            </select>
          </div>

          <div style={{ display:"flex", gap:10, marginTop:8 }}>
            <button className="btn btn-secondary" style={{ flex:1 }} onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}
              onClick={() => onConfirm(asset.assetId, { condition, nextStatus })}
              disabled={saving}
            >
              {saving ? "Processing…" : <><Undo2 size={15} /> Confirm Return</>}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scaleIn {
          from { opacity:0; transform:translate(-50%, -50%) scale(0.95); }
          to { opacity:1; transform:translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
};

// ── Main Component ──────────────────────────────────────────────
export default function Assets() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchText, setSearchText] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [returnTarget, setReturnTarget] = useState(null);
  const [returning, setReturning] = useState(false);
  const [updating, setUpdating] = useState(new Set());

  // ── Data loading ──────────────────────────────────────────────
  const loadData = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/assets`)
      .then((r) => { setAssets(r.data); setError(""); })
      .catch(() => { setAssets([]); setError("Couldn't load assets. Is the Spring Boot API running on :8080?"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Form helpers ──────────────────────────────────────────────
  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  // ── Save asset ──────────────────────────────────────────────────
  const saveAsset = () => {
    const required = [
      ["assetType", "Asset Type"],
      ["laptopName", "Asset Name"],
      ["brand", "Brand"],
      ["model", "Model"],
      ["serialNumber", "Serial Number"],
      ["location", "Location"],
    ];
    for (const [k, label] of required) {
      if (!form[k]?.trim()) {
        toast(`${label} is required.`, "error");
        return;
      }
    }
    setSaving(true);
    axios.post(`${API}/assets`, form)
      .then(() => {
        toast("Asset added to inventory.", "success");
        setForm(EMPTY_FORM);
        setShowForm(false);
        loadData();
      })
      .catch((err) => toast(err.response?.data?.message || "Couldn't save asset.", "error"))
      .finally(() => setSaving(false));
  };

  // ── Return asset ──────────────────────────────────────────────
  const handleReturn = (assetId, { condition, nextStatus }) => {
    setReturning(true);
    axios.put(`${API}/assets/return/${assetId}`, { condition, assetStatus: nextStatus })
      .then(() => {
        toast("Asset returned and inventory updated.", "success");
        setReturnTarget(null);
        loadData();
      })
      .catch(() => toast("Couldn't process return. Is the API running?", "error"))
      .finally(() => setReturning(false));
  };

  // ── Delete asset ──────────────────────────────────────────────
  const deleteAsset = (id) => {
    if (!window.confirm("Permanently delete this asset? This cannot be undone.")) return;
    axios.delete(`${API}/assets/${id}`)
      .then(() => { toast("Asset deleted.", "success"); loadData(); })
      .catch(() => toast("Couldn't delete asset.", "error"));
  };

  // ── Update condition (send full object) ──────────────────────
  const updateAsset = (assetId, fieldName, newValue) => {
    if (updating.has(assetId)) return;

    // Find current asset
    const currentAsset = assets.find(a => a.assetId === assetId);
    if (!currentAsset) return;

    // Build updated full object
    const updatedAsset = {
      ...currentAsset,
      [fieldName]: newValue
    };

    // Optimistic UI
    setAssets(prev =>
      prev.map(a =>
        a.assetId === assetId ? updatedAsset : a
      )
    );

    setUpdating(prev => new Set(prev).add(assetId));

    // Send full object
    axios.put(`${API}/assets/${assetId}`, updatedAsset)
      .then(() => {
        toast("Asset updated successfully.", "success");
      })
      .catch((err) => {
        // Log detailed error for debugging
        console.error("Update error:", err.response?.data || err.message);
        toast(err.response?.data?.message || "Failed to update asset.", "error");
        loadData(); // revert
      })
      .finally(() => {
        setUpdating(prev => {
          const next = new Set(prev);
          next.delete(assetId);
          return next;
        });
      });
  };

  // ── Derived data ──────────────────────────────────────────────
  const uniqueTypes = useMemo(
    () => ["All", ...new Set(assets.map(a => a.assetType).filter(Boolean))],
    [assets]
  );

  const filtered = useMemo(() =>
    assets
      .filter(a =>
        (a.laptopName || "").toLowerCase().includes(searchText.toLowerCase()) ||
        (a.serialNumber || "").toLowerCase().includes(searchText.toLowerCase()) ||
        (a.brand || "").toLowerCase().includes(searchText.toLowerCase()) ||
        (a.location || "").toLowerCase().includes(searchText.toLowerCase()) ||
        (a.assetType || "").toLowerCase().includes(searchText.toLowerCase())
      )
      .filter(a => statusFilter === "All" || a.assetStatus === statusFilter)
      .filter(a => typeFilter === "All" || a.assetType === typeFilter),
    [assets, searchText, statusFilter, typeFilter]
  );

  const counts = useMemo(() => ({
    total: assets.length,
    available: assets.filter(a => a.assetStatus === "Available").length,
    assigned: assets.filter(a => a.assetStatus === "Assigned").length,
    spare: assets.filter(a => a.assetStatus === "Spare").length,
    underRepair: assets.filter(a => a.assetStatus === "Under Repair").length,
    faulty: assets.filter(a => a.assetStatus === "Faulty").length,
  }), [assets]);

  const kpis = [
    { label: "Total", value: counts.total, icon: <LayoutGrid size={19} />, gradA: "#1e3a8a", gradB: "#2563eb", glow: "rgba(37,99,235,0.45)" },
    { label: "Available", value: counts.available, icon: <CheckCircle2 size={19} />, gradA: "#065f46", gradB: "#10b981", glow: "rgba(16,185,129,0.4)" },
    { label: "Assigned", value: counts.assigned, icon: <UserCheck size={19} />, gradA: "#3730a3", gradB: "#6366f1", glow: "rgba(99,102,241,0.4)" },
    { label: "Spare", value: counts.spare, icon: <Archive size={19} />, gradA: "#92400e", gradB: "#d97706", glow: "rgba(217,119,6,0.4)" },
    { label: "Under Repair", value: counts.underRepair, icon: <Wrench size={19} />, gradA: "#9a3412", gradB: "#ea580c", glow: "rgba(234,88,12,0.4)" },
    { label: "Faulty", value: counts.faulty, icon: <AlertTriangle size={19} />, gradA: "#991b1b", gradB: "#ef4444", glow: "rgba(239,68,68,0.4)" },
  ];

  // ── Render ────────────────────────────────────────────────────
  return (
    <Layout
      title="Assets"
      subtitle="Manage your IT asset inventory"
      actions={
        <button
          className="btn btn-primary"
          onClick={() => { setShowForm(v => !v); setForm(EMPTY_FORM); }}
          style={{ display:"flex", alignItems:"center", gap:6 }}
        >
          {showForm ? <><X size={15} /> Cancel</> : <><Plus size={15} /> Add Asset</>}
        </button>
      }
    >
      {/* Error banner */}
      {error && (
        <div className="card" style={{
          marginBottom:20,
          borderColor:"#fecaca",
          background:"#fef2f2",
          padding:"12px 18px",
          fontSize:13,
          color:"#991b1b",
          display:"flex", gap:8, alignItems:"center",
        }}>
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="kpi-row kpi-row-6" style={{ marginBottom:28 }}>
        {kpis.map(s => {
          const active = statusFilter === s.label;
          return (
            <AssetKpiCard
              key={s.label}
              {...s}
              active={active}
              loading={loading}
              onClick={() => setStatusFilter(active ? "All" : s.label)}
            />
          );
        })}
      </div>

      {/* ── Add Asset Form ── */}
      {showForm && (
        <div className="card" style={{ marginBottom:28, animation:"fadeIn 0.2s ease" }}>
          <div className="card-header">
            <div>
              <div className="card-title">Register New Asset</div>
              <div className="card-subtitle">Fill in the details below to add a device to inventory</div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-section-label">Required Information</div>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Asset Type *</label>
                <select className="input" {...field("assetType")}>
                  <option value="">Select type…</option>
                  {ASSET_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Asset Name *</label>
                <input className="input" {...field("laptopName")} placeholder="e.g. MacBook Pro 14" />
              </div>
              <div className="field">
                <label className="field-label">Brand *</label>
                <input className="input" {...field("brand")} placeholder="e.g. Apple" />
              </div>
              <div className="field">
                <label className="field-label">Model *</label>
                <input className="input" {...field("model")} placeholder="e.g. M3 Pro" />
              </div>
              <div className="field">
                <label className="field-label">Serial Number *</label>
                <input className="input" {...field("serialNumber")} placeholder="Unique serial" />
              </div>
              <div className="field">
                <label className="field-label">Location *</label>
                <input className="input" {...field("location")} placeholder="e.g. Chennai HQ" />
              </div>
            </div>

            <div className="form-section-label" style={{ marginTop:20 }}>Optional Details</div>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Purchase Date</label>
                <input className="input" type="date" {...field("purchaseDate")} />
              </div>
              <div className="field">
                <label className="field-label">Warranty Expiry</label>
                <input className="input" type="date" {...field("warrantyExpiry")} />
              </div>
              <div className="field">
                <label className="field-label">Vendor</label>
                <input className="input" {...field("vendor")} placeholder="e.g. Ingram Micro" />
              </div>
              <div className="field">
                <label className="field-label">Cost (₹)</label>
                <input className="input" type="number" min="0" {...field("assetCost")} placeholder="85000" />
              </div>
              <div className="field" style={{ gridColumn:"span 2" }}>
                <label className="field-label">Remarks</label>
                <input className="input" {...field("remarks")} placeholder="Any additional notes" />
              </div>
            </div>

            <div style={{ display:"flex", gap:12, marginTop:24, paddingTop:20, borderTop:"1px solid var(--gray-100)" }}>
              <button className="btn btn-primary" onClick={saveAsset} disabled={saving} style={{ display:"flex", alignItems:"center", gap:6 }}>
                {saving ? "Saving…" : <><CheckCircle2 size={15} /> Add to Inventory</>}
              </button>
              <button className="btn btn-secondary" onClick={() => { setForm(EMPTY_FORM); setShowForm(false); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Asset Table ── */}
      <div className="card">
        <div className="card-header" style={{ flexWrap:"wrap", gap:10 }}>
          <div>
            <div className="card-title">Asset Inventory</div>
            <div className="card-subtitle">
              {loading ? "Loading…" : `${filtered.length} of ${assets.length} assets`}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <select
              className="input"
              style={{ width:140 }}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              {uniqueTypes.map(t => <option key={t} value={t}>{t === "All" ? "All types" : t}</option>)}
            </select>
            <select
              className="input"
              style={{ width:140 }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">All statuses</option>
              {ASSET_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <div style={{ position:"relative" }}>
              <Search size={14} style={{
                position:"absolute", left:12, top:"50%",
                transform:"translateY(-50%)",
                color:"var(--gray-400)",
                pointerEvents:"none",
              }} />
              <input
                className="input"
                style={{ paddingLeft:34, width:200 }}
                placeholder="Search assets…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  style={{
                    position:"absolute", right:8, top:"50%",
                    transform:"translateY(-50%)",
                    background:"none", border:"none",
                    cursor:"pointer", color:"var(--gray-400)",
                    display:"flex", alignItems:"center",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              className="btn btn-secondary btn-icon"
              onClick={loadData}
              disabled={loading}
            >
              <RotateCcw size={15} className={loading ? "spin-icon" : ""} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width:40, textAlign:"center" }}>#</th>
                  <th>Asset Name</th>
                  <th>Type</th>
                  <th>Brand / Model</th>
                  <th>Serial No.</th>
                  <th>Location</th>
                  <th style={{ minWidth:120 }}>Condition</th>
                  <th>Status</th>
                  <th style={{ width:140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length:6 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ opacity:0.35, display:"flex", justifyContent:"center" }}>
              {searchText || statusFilter !== "All" || typeFilter !== "All"
                ? <PackageX size={40} />
                : <PackageSearch size={40} />}
            </div>
            <div className="empty-title">
              {searchText || statusFilter !== "All" || typeFilter !== "All"
                ? "No matching assets"
                : "Inventory is empty"}
            </div>
            <div className="empty-sub">
              {searchText || statusFilter !== "All" || typeFilter !== "All"
                ? "Try adjusting your filters or search terms"
                : "Click 'Add Asset' to begin building your inventory"}
            </div>
            {(searchText || statusFilter !== "All" || typeFilter !== "All") && (
              <button
                className="btn btn-secondary"
                style={{ marginTop:12 }}
                onClick={() => { setSearchText(""); setStatusFilter("All"); setTypeFilter("All"); }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width:40, textAlign:"center" }}>#</th>
                  <th>Asset Name</th>
                  <th>Type</th>
                  <th>Brand / Model</th>
                  <th>Serial No.</th>
                  <th>Location</th>
                  <th style={{ minWidth:120 }}>Condition</th>
                  <th>Status</th>
                  <th style={{ width:140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset, index) => {
                  const isUpdating = updating.has(asset.assetId);
                  const style = conditionStyles[asset.assetCondition] || conditionStyles["New"];

                  return (
                    <tr key={asset.assetId} className="asset-row">
                      <td style={{ textAlign:"center", fontWeight:600, color:"var(--gray-400)", fontSize:12 }}>
                        {index + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight:600, color:"var(--gray-900)", fontSize:13.5 }}>
                          {asset.laptopName}
                        </div>
                        {asset.employeeName && (
                          <div style={{ fontSize:11.5, color:"var(--gray-500)", marginTop:1 }}>
                            → {asset.employeeName}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="tag tag-blue">{asset.assetType}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight:500, color:"var(--gray-800)" }}>{asset.brand}</span>
                        {asset.model && <span style={{ color:"var(--gray-400)", marginLeft:4 }}>· {asset.model}</span>}
                      </td>
                      <td>
                        <span style={{
                          fontFamily:"'SF Mono','Fira Code',monospace",
                          fontSize:11,
                          background:"var(--gray-100)",
                          padding:"2px 8px",
                          borderRadius:4,
                          color:"var(--gray-600)",
                        }}>
                          {asset.serialNumber}
                        </span>
                      </td>
                      <td style={{ color:"var(--gray-600)" }}>{asset.location || "—"}</td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          {/* Coloured dot */}
                          <span style={{
                            display:"inline-block",
                            width:12, height:12,
                            borderRadius:"50%",
                            background: style.border,
                            flexShrink:0,
                          }} />
                          {/* Condition dropdown with styling */}
                          <select
                            className="condition-select"
                            value={asset.assetCondition}
                            onChange={(e) => updateAsset(asset.assetId, 'assetCondition', e.target.value)}
                            disabled={isUpdating}
                            style={{
                              background: style.bg,
                              borderColor: style.border,
                              color: style.text,
                              fontWeight:600,
                            }}
                          >
                            {ASSET_CONDITIONS.map(c => {
                              const s = conditionStyles[c] || conditionStyles["New"];
                              return (
                                <option
                                  key={c}
                                  value={c}
                                  style={{
                                    background: s.bg,
                                    color: s.text,
                                    fontWeight:600,
                                  }}
                                >
                                  {c}
                                </option>
                              );
                            })}
                          </select>
                          {isUpdating && <span style={{ fontSize:11, color:"var(--gray-400)" }}>⏳</span>}
                        </div>
                      </td>
                      <td><StatusPill status={asset.assetStatus} /></td>
                      <td>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          {asset.assetStatus === "Assigned" && (
                            <button
                              className="action-return"
                              onClick={() => setReturnTarget(asset)}
                            >
                              <Undo2 size={13} /> Return
                            </button>
                          )}
                          <button
                            className="action-delete"
                            onClick={() => deleteAsset(asset.assetId)}
                            title="Delete asset"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ReturnDialog
        asset={returnTarget}
        onClose={() => setReturnTarget(null)}
        onConfirm={handleReturn}
        saving={returning}
      />

      {/* Inline styles for component-specific classes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin-icon {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin-icon { animation: spin-icon 0.7s linear infinite; }
        .asset-row td {
          padding: 13px 14px;
          border-bottom: 1px solid var(--gray-100);
          font-size: 13px;
          transition: background 0.15s ease;
        }
        .asset-row:hover td {
          background: var(--primary-50);
        }
        .asset-row:nth-child(even) td {
          background: #fafbfd;
        }
        .asset-row:nth-child(even):hover td {
          background: var(--primary-50);
        }
        .condition-select {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1.5px solid var(--gray-200);
          font-size: 12px;
          background: #fff;
          width: 100%;
          min-width: 110px;
          transition: 0.15s;
          cursor: pointer;
        }
        .condition-select:hover {
          box-shadow: var(--shadow-xs);
        }
        .condition-select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
          outline: none;
        }
        .condition-select:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .action-return {
          background: linear-gradient(135deg, #dcfce7, #bbf7d0);
          color: #065f46;
          border: none;
          padding: 5px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.18s cubic-bezier(0.16,1,0.3,1);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          box-shadow: 0 1px 2px rgba(16,185,129,0.15);
        }
        .action-return:hover {
          background: linear-gradient(135deg, #bbf7d0, #86efac);
          transform: translateY(-1px) scale(1.03);
          box-shadow: 0 4px 10px rgba(16,185,129,0.25);
        }
        .action-delete {
          background: transparent;
          border: none;
          color: var(--gray-400);
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          transition: 0.15s;
          display: inline-flex;
          align-items: center;
        }
        .action-delete:hover {
          background: var(--danger-bg);
          color: var(--danger);
          transform: scale(1.06);
        }
      `}</style>
    </Layout>
  );
} 