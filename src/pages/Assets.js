import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import StatusPill from "../components/StatusPill";
import EmailStatusPill from "../components/EmailStatusPill";
import SendEmailModal from "../components/SendEmailModal";
import { useToast } from "../utils/Toast";
import "./Assets.css";

const API = "https://haodaasset-backend-1.onrender.com";

const ASSET_STATUSES = ["Available","Assigned","Spare","Under Repair","Faulty","Lost","Retired","Disposed"];
const ASSET_CONDITIONS = ["New","Excellent","Good","Fair","Faulty","Damaged"];
const ASSET_TYPES = ["Laptop","Desktop","Monitor","Keyboard","Mouse","Headset","Mobile","Tablet","Printer","Server","Network Device","Other"];
const LOCATIONS = ["Chennai - Kilpauk", "Chennai - Chetpet", "Mumbai"];

const EMPTY_FORM = {
  assetType:"", laptopName:"", brand:"", model:"", serialNumber:"",
  location:"", assetStatus:"Available", assetCondition:"New",
  purchaseDate:"", warrantyExpiry:"", vendor:"", assetCost:"",
  processor:"", ram:"", storage:"", remarks:"",
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

// ── Skeleton loader ──────────────────────────────────────────────
const SkeletonRow = () => {
  const cell = (w = 80) => (
    <td>
      <div className="skeleton skeleton-text" style={{ width: w, margin: 0 }} />
    </td>
  );
  return <tr>{cell(30)}{cell(100)}{cell(70)}{cell(90)}{cell(80)}{cell(60)}{cell(70)}{cell(80)}{cell(90)}{cell(90)}</tr>;
};

// ── Return Dialog (Modal) ────────────────────────────────────────
const ReturnDialog = ({ asset, onClose, onConfirm, saving }) => {
  const [condition, setCondition] = useState("Good");
  const [nextStatus, setNextStatus] = useState("Available");
  if (!asset) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 className="modal-title">Return Asset</h3>
            <div className="card-subtitle" style={{ marginTop: 4 }}>
              {asset.laptopName} · SN: {asset.serialNumber}
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="field">
            <label className="field-label">Returned Condition</label>
            <div className="selector-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
              {["Excellent","Good","Fair","Faulty","Damaged"].map(c => (
                <button
                  key={c}
                  type="button"
                  className={`btn btn-sm ${condition === c ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setCondition(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">Move Asset To</label>
            <select
              className="input"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
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
              style={{ flex:1 }}
              onClick={() => onConfirm(asset.assetId, { condition, nextStatus })}
              disabled={saving}
            >
              {saving ? "Processing…" : "↩ Confirm Return"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Asset type → icon / gradient (drives the drawer hero) ──────────
const ASSET_TYPE_VISUALS = {
  "Laptop":        { icon: "💻", gradient: "linear-gradient(135deg,#2563eb,#7c3aed)" },
  "Desktop":       { icon: "🖥️", gradient: "linear-gradient(135deg,#0891b2,#2563eb)" },
  "Monitor":       { icon: "🖥️", gradient: "linear-gradient(135deg,#0891b2,#0e7490)" },
  "Mobile":        { icon: "📱", gradient: "linear-gradient(135deg,#db2777,#7c3aed)" },
  "Tablet":        { icon: "📱", gradient: "linear-gradient(135deg,#db2777,#c026d3)" },
  "Printer":       { icon: "🖨️", gradient: "linear-gradient(135deg,#475569,#1e293b)" },
  "Keyboard":      { icon: "⌨️", gradient: "linear-gradient(135deg,#64748b,#334155)" },
  "Mouse":         { icon: "🖱️", gradient: "linear-gradient(135deg,#64748b,#334155)" },
  "Headset":       { icon: "🎧", gradient: "linear-gradient(135deg,#7c3aed,#c026d3)" },
  "Server":        { icon: "🗄️", gradient: "linear-gradient(135deg,#1e293b,#0f172a)" },
};
const DEFAULT_TYPE_VISUAL = { icon: "📦", gradient: "linear-gradient(135deg,#475569,#1e293b)" };

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
};

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

// ── Asset Detail Drawer ─────────────────────────────────────────
const AssetDetailDrawer = ({ asset, onClose, onEdit }) => {
  const [copied, setCopied] = useState(false);
  if (!asset) return null;

  const visual = ASSET_TYPE_VISUALS[asset.assetType] || DEFAULT_TYPE_VISUAL;
  const style = conditionStyles[asset.assetCondition] || conditionStyles["New"];
  const specs = [asset.processor, asset.ram, asset.storage].filter(Boolean).join(" · ");

  const copySerial = async () => {
    if (!asset.serialNumber) return;
    try {
      await navigator.clipboard.writeText(asset.serialNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch { /* clipboard permission denied — silently ignore */ }
  };

  const warrantyDays = daysUntil(asset.warrantyExpiry);

  // Build the lifecycle timeline from whichever dates actually exist.
  const timeline = [];
  if (asset.purchaseDate) {
    timeline.push({ label: "Purchased", date: formatDate(asset.purchaseDate), state: "done" });
  }
  if (asset.warrantyExpiry) {
    const expired = warrantyDays !== null && warrantyDays < 0;
    const soon = warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 60;
    timeline.push({
      label: "Warranty",
      date: formatDate(asset.warrantyExpiry),
      state: expired ? "danger" : soon ? "warn" : "done",
      badge: expired ? "Expired" : soon ? `${warrantyDays}d left` : null,
      badgeStyle: expired
        ? { background: "var(--danger-bg)", color: "var(--danger)" }
        : { background: "var(--warning-bg)", color: "var(--warning)" },
    });
  }
  if (asset.assignedDate) {
    timeline.push({ label: `Assigned${asset.employeeName ? ` to ${asset.employeeName}` : ""}`, date: formatDate(asset.assignedDate), state: "done" });
  }
  if (asset.returnedStatus === "Yes" && asset.returnDate) {
    timeline.push({ label: "Returned", date: formatDate(asset.returnDate), state: "done" });
  }
  if (asset.relievedStatus === "Yes" && asset.relievedDate) {
    timeline.push({ label: "Employee relieved", date: formatDate(asset.relievedDate), state: "warn" });
  }

  return (
    <div className="asset-drawer-overlay" onClick={onClose}>
      <div className="asset-drawer" onClick={(e) => e.stopPropagation()}>

        {/* ── Hero ── */}
        <div className="asset-drawer-hero" style={{ background: visual.gradient }}>
          <button className="asset-drawer-close" onClick={onClose} aria-label="Close">✕</button>
          <div className="asset-drawer-icon">{visual.icon}</div>
          <h3 className="asset-drawer-name">{asset.laptopName}</h3>
          <div className="asset-drawer-sub">{asset.assetType}{asset.brand ? ` · ${asset.brand}` : ""}{asset.model ? ` ${asset.model}` : ""}</div>
          <div className="asset-drawer-pills">
            <StatusPill status={asset.assetStatus} />
            <span className="pill" style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}>
              {asset.assetCondition}
            </span>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="asset-drawer-body">

          <div className="asset-drawer-section">
            <div className="asset-drawer-section-title">Serial Number</div>
            <div className="asset-drawer-serial">
              <span>{asset.serialNumber || "—"}</span>
              {asset.serialNumber && (
                <button className={`asset-drawer-copy-btn${copied ? " is-copied" : ""}`} onClick={copySerial}>
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              )}
            </div>
          </div>

          <div className="asset-drawer-section">
            <div className="asset-drawer-section-title">Overview</div>
            <div className="asset-drawer-grid">
              <div className="asset-drawer-stat">
                <div className="asset-drawer-stat-label">Location</div>
                <div className="asset-drawer-stat-value">{asset.location || "—"}</div>
              </div>
              <div className="asset-drawer-stat">
                <div className="asset-drawer-stat-label">Vendor</div>
                <div className="asset-drawer-stat-value">{asset.vendor || "—"}</div>
              </div>
              <div className="asset-drawer-stat">
                <div className="asset-drawer-stat-label">Cost</div>
                <div className="asset-drawer-stat-value">{asset.assetCost ? `₹${asset.assetCost}` : "—"}</div>
              </div>
              <div className="asset-drawer-stat">
                <div className="asset-drawer-stat-label">Email Status</div>
                <div className="asset-drawer-stat-value"><EmailStatusPill status={asset.emailStatus} /></div>
              </div>
            </div>
            {specs && (
              <div className="asset-drawer-stat" style={{ marginTop: 12 }}>
                <div className="asset-drawer-stat-label">Specifications</div>
                <div className="asset-drawer-stat-value">{specs}</div>
              </div>
            )}
          </div>

          <div className="asset-drawer-section">
            <div className="asset-drawer-section-title">Assignment</div>
            {asset.employeeName ? (
              <div className="asset-drawer-assignee">
                <div className="asset-drawer-avatar">{getInitials(asset.employeeName)}</div>
                <div>
                  <div className="asset-drawer-assignee-name">{asset.employeeName}</div>
                  <div className="asset-drawer-assignee-meta">
                    {asset.employeeRole || "Employee"}{asset.employeeId ? ` · ${asset.employeeId}` : ""}
                  </div>
                </div>
              </div>
            ) : (
              <div className="asset-drawer-empty">Not currently assigned to anyone.</div>
            )}
          </div>

          {timeline.length > 0 && (
            <div className="asset-drawer-section">
              <div className="asset-drawer-section-title">Lifecycle</div>
              <div className="asset-drawer-timeline">
                {timeline.map((t, i) => (
                  <div key={i} className={`asset-drawer-tl-item is-${t.state}`}>
                    <div className="asset-drawer-tl-dot" />
                    <div className="asset-drawer-tl-label">
                      {t.label}
                      {t.badge && <span className="asset-drawer-tl-badge" style={t.badgeStyle}>{t.badge}</span>}
                    </div>
                    <div className="asset-drawer-tl-date">{t.date}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {asset.remarks && (
            <div className="asset-drawer-section">
              <div className="asset-drawer-section-title">Remarks</div>
              <div className="asset-drawer-notes">{asset.remarks}</div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="asset-drawer-footer">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Close</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onEdit(asset)}>✏️ Edit Asset</button>
        </div>
      </div>
    </div>
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
  const [locationFilter, setLocationFilter] = useState("All");
  const [returnTarget, setReturnTarget] = useState(null);
  const [returning, setReturning] = useState(false);
  const [viewingAsset, setViewingAsset] = useState(null); // asset currently shown in the detail drawer
  const [emailTarget, setEmailTarget] = useState(null); // asset currently in the Send Email modal
  const [updating, setUpdating] = useState(new Set());
  const [editingAsset, setEditingAsset] = useState(null); // null = add mode, asset obj = edit mode
  const [employeeEmailById, setEmployeeEmailById] = useState({}); // employeeId -> email, for the Send Email gate/modal

  // ── Data loading ──────────────────────────────────────────────
  const loadData = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/assets`)
      .then((r) => { setAssets(r.data); setError(""); })
      .catch(() => { setAssets([]); setError("Couldn't load assets. Is the Spring Boot API running on :8080?"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Employee emails, used to gate/populate the "Send Email" action
  useEffect(() => {
    axios.get(`${API}/api/admin/employees`)
      .then((r) => {
        const map = {};
        (r.data || []).forEach((e) => { map[e.employeeId] = e.email; });
        setEmployeeEmailById(map);
      })
      .catch(() => { /* Send Email button simply stays hidden if this fails */ });
  }, []);

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

  // ── Open edit form ──────────────────────────────────────────────
  const openEdit = (asset) => {
    setEditingAsset(asset);
    setForm({
      assetType:      asset.assetType      || "",
      laptopName:     asset.laptopName     || "",
      brand:          asset.brand          || "",
      model:          asset.model          || "",
      serialNumber:   asset.serialNumber   || "",
      location:       asset.location       || "",
      assetStatus:    asset.assetStatus    || "Available",
      assetCondition: asset.assetCondition || "Good",
      purchaseDate:   asset.purchaseDate   || "",
      warrantyExpiry: asset.warrantyExpiry || "",
      vendor:         asset.vendor         || "",
      assetCost:      asset.assetCost      || "",
      processor:      asset.processor      || "",
      ram:            asset.ram            || "",
      storage:        asset.storage        || "",
      remarks:        asset.remarks        || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Save edited asset ───────────────────────────────────────────
  const saveEdit = () => {
    const required = [
      ["assetType",    "Asset Type"],
      ["laptopName",   "Asset Name"],
      ["brand",        "Brand"],
      ["model",        "Model"],
      ["serialNumber", "Serial Number"],
      ["location",     "Location"],
    ];
    for (const [k, label] of required) {
      if (!form[k]?.trim()) { toast(`${label} is required.`, "error"); return; }
    }
    setSaving(true);
    axios.put(`${API}/assets/${editingAsset.assetId}`, form)
      .then(() => {
        toast("Asset updated successfully.", "success");
        setShowForm(false);
        setEditingAsset(null);
        setForm(EMPTY_FORM);
        loadData();
      })
      .catch((err) => toast(err.response?.data?.message || "Couldn't update asset.", "error"))
      .finally(() => setSaving(false));
  };

  // ── Cancel form ─────────────────────────────────────────────────
  const cancelForm = () => {
    setShowForm(false);
    setEditingAsset(null);
    setForm(EMPTY_FORM);
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

  // ── Send assignment email ───────────────────────────────────────
  const handleEmailSent = (updatedAsset, message, isError = false) => {
    if (isError) {
      toast(message, "error");
      // Reflect the failure immediately without a full reload
      setAssets((prev) => prev.map((a) =>
        a.assetId === emailTarget?.assetId ? { ...a, emailStatus: "Failed" } : a
      ));
      return;
    }
    toast(message, "success");
    setEmailTarget(null);
    if (updatedAsset) {
      setAssets((prev) => prev.map((a) => (a.assetId === updatedAsset.assetId ? updatedAsset : a)));
    } else {
      loadData();
    }
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
      .filter(a => typeFilter === "All" || a.assetType === typeFilter)
      .filter(a => locationFilter === "All" || (a.location || "") === locationFilter),
    [assets, searchText, statusFilter, typeFilter, locationFilter]
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
    { label: "Total", value: counts.total, icon: "📊", color: "var(--primary)", bg: "var(--primary-50)" },
    { label: "Available", value: counts.available, icon: "✅", color: "var(--success)", bg: "var(--success-bg)" },
    { label: "Assigned", value: counts.assigned, icon: "👤", color: "#3b82f6", bg: "#dbeafe" },
    { label: "Spare", value: counts.spare, icon: "🔧", color: "#f59e0b", bg: "#fef3c7" },
    { label: "Under Repair", value: counts.underRepair, icon: "🔨", color: "#f97316", bg: "#ffedd5" },
    { label: "Faulty", value: counts.faulty, icon: "⚠️", color: "#ef4444", bg: "#fee2e2" },
  ];

  // ── Render ────────────────────────────────────────────────────
  return (
    <Layout
      title="Assets"
      subtitle="Manage your IT asset inventory"
      actions={
        <button
          className="btn btn-primary"
          onClick={() => { if (showForm) { cancelForm(); } else { setEditingAsset(null); setForm(EMPTY_FORM); setShowForm(true); } }}
          style={{ display:"flex", alignItems:"center", gap:6 }}
        >
          {showForm ? "✕ Cancel" : "+ Add Asset"}
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
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(6, 1fr)",
        gap:14,
        marginBottom:28,
      }}>
        {kpis.map(s => {
          const active = statusFilter === s.label;
          return (
            <div
              key={s.label}
              onClick={() => setStatusFilter(active ? "All" : s.label)}
              style={{
                background:"#fff",
                borderRadius:12,
                padding:"16px 18px",
                borderLeft: `4px solid ${s.color}`,
                boxShadow: active
                  ? `0 0 0 2px ${s.color}30, var(--shadow-sm)`
                  : "var(--shadow-xs)",
                cursor:"pointer",
                transition:"all 0.15s ease",
                transform: active ? "translateY(-2px)" : "none",
                border: active ? `1px solid ${s.color}40` : "1px solid transparent",
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{
                    fontSize:24,
                    fontWeight:800,
                    color: loading ? "var(--gray-300)" : s.color,
                    lineHeight:1.2,
                  }}>
                    {loading ? "—" : s.value}
                  </div>
                  <div style={{
                    fontSize:10,
                    fontWeight:700,
                    color:"var(--gray-400)",
                    marginTop:4,
                    textTransform:"uppercase",
                    letterSpacing:"0.05em",
                  }}>
                    {s.label}
                  </div>
                </div>
                <div style={{ fontSize:28, opacity:0.5 }}>{s.icon}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add Asset Form ── */}
      {showForm && (
        <div className="card" style={{ marginBottom:28, animation:"fadeIn 0.2s ease" }}>
          <div className="card-header">
            <div>
              <div className="card-title">{editingAsset ? "Edit Asset" : "Register New Asset"}</div>
              <div className="card-subtitle">{editingAsset ? `Editing: ${editingAsset.laptopName} · ${editingAsset.serialNumber}` : "Fill in the details below to add a device to inventory"}</div>
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
                <select className="input" {...field("location")}>
                  <option value="">Select branch…</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="form-section-label" style={{ marginTop:20 }}>Hardware Specifications</div>
            <div className="form-grid">
              <div className="field" style={{ gridColumn:"span 2" }}>
                <label className="field-label">Processor</label>
                <input className="input" {...field("processor")} placeholder="e.g. Intel Core i7-10510U @1.90GHz" />
              </div>
              <div className="field">
                <label className="field-label">RAM</label>
                <input className="input" {...field("ram")} placeholder="e.g. 16GB" />
              </div>
              <div className="field">
                <label className="field-label">Storage</label>
                <input className="input" {...field("storage")} placeholder="e.g. 512GB SSD" />
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
              <button className="btn btn-primary" onClick={editingAsset ? saveEdit : saveAsset} disabled={saving}>
                {saving ? "Saving…" : editingAsset ? "✓ Save Changes" : "✓ Add to Inventory"}
              </button>
              <button className="btn btn-secondary" onClick={cancelForm}>
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
            <select
              className="input"
              style={{ width:160 }}
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
            >
              <option value="All">All locations</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <div style={{ position:"relative" }}>
              <svg style={{
                position:"absolute", left:12, top:"50%",
                transform:"translateY(-50%)",
                color:"var(--gray-400)",
                pointerEvents:"none",
              }} width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
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
                    position:"absolute", right:10, top:"50%",
                    transform:"translateY(-50%)",
                    background:"none", border:"none",
                    cursor:"pointer", color:"var(--gray-400)",
                    fontSize:14,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <button
              className="btn btn-secondary btn-icon"
              onClick={loadData}
              disabled={loading}
              style={{ fontSize:16 }}
            >
              ↻
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
            <div className="empty-icon" style={{ opacity:0.3 }}>
              {searchText || statusFilter !== "All" || typeFilter !== "All" || locationFilter !== "All" ? "🔍" : "📦"}
            </div>
            <div className="empty-title">
              {searchText || statusFilter !== "All" || typeFilter !== "All" || locationFilter !== "All"
                ? "No matching assets"
                : "Inventory is empty"}
            </div>
            <div className="empty-sub">
              {searchText || statusFilter !== "All" || typeFilter !== "All" || locationFilter !== "All"
                ? "Try adjusting your filters or search terms"
                : "Click 'Add Asset' to begin building your inventory"}
            </div>
            {(searchText || statusFilter !== "All" || typeFilter !== "All" || locationFilter !== "All") && (
              <button
                className="btn btn-secondary"
                style={{ marginTop:12 }}
                onClick={() => { setSearchText(""); setStatusFilter("All"); setTypeFilter("All"); setLocationFilter("All"); }}
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
                  <th>Email Status</th>
                  <th style={{ width:170 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((asset, index) => {
                  const isUpdating = updating.has(asset.assetId);
                  const style = conditionStyles[asset.assetCondition] || conditionStyles["New"];
                  const employeeEmail = asset.employeeId ? employeeEmailById[asset.employeeId] : null;
                  const canSendEmail = asset.assetStatus === "Assigned" && !!asset.employeeId && !!employeeEmail;

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
                      <td><EmailStatusPill status={asset.emailStatus} /></td>
                      <td>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <button
                            className="action-edit"
                            onClick={() => setViewingAsset(asset)}
                            title="View asset details"
                          >
                            👁
                          </button>
                          <button
                            className="action-edit"
                            onClick={() => openEdit(asset)}
                            title="Edit asset"
                          >
                            ✏️
                          </button>
                          {asset.assetStatus === "Assigned" && (
                            <button
                              className="action-return"
                              onClick={() => setReturnTarget(asset)}
                            >
                              ↩ Return
                            </button>
                          )}
                          {canSendEmail && (
                            <button
                              className="action-send-email"
                              onClick={() => setEmailTarget({ ...asset, employeeEmail })}
                              title="Send assignment email"
                            >
                              📧 Email
                            </button>
                          )}
                          <button
                            className="action-delete"
                            onClick={() => deleteAsset(asset.assetId)}
                            title="Delete asset"
                          >
                            🗑
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

      <AssetDetailDrawer
        asset={viewingAsset}
        onClose={() => setViewingAsset(null)}
        onEdit={(asset) => { setViewingAsset(null); openEdit(asset); }}
      />

      <SendEmailModal
        asset={emailTarget}
        onClose={() => setEmailTarget(null)}
        onSent={handleEmailSent}
      />

      {/* Inline styles for component-specific classes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .asset-row td {
          padding: 12px 14px;
          border-bottom: 1px solid var(--gray-100);
          font-size: 13px;
        }
        .asset-row:hover td {
          background: var(--gray-50);
        }
        .asset-row:nth-child(even) td {
          background: #fafcfd;
        }
        .asset-row:nth-child(even):hover td {
          background: var(--gray-50);
        }
        .condition-select {
          padding: 5px 10px;
          border-radius: 8px;
          border: 1px solid var(--gray-200);
          font-size: 12px;
          background: #fff;
          width: 100%;
          min-width: 110px;
          transition: 0.15s;
          cursor: pointer;
        }
        .condition-select:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(79,70,229,0.1);
          outline: none;
        }
        .condition-select:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .action-return {
          background: var(--success-bg);
          color: #065f46;
          border: none;
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .action-return:hover {
          background: #a7f3d0;
          transform: scale(1.04);
        }
        .action-send-email {
          background: var(--primary-50);
          border: 1px solid var(--primary-200);
          color: var(--primary-700);
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
        }
        .action-send-email:hover {
          background: var(--primary-100);
          border-color: var(--primary-300, var(--primary-200));
          transform: translateY(-1px);
        }
        .action-edit {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          border-radius: 7px;
          padding: 5px 10px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex; align-items: center; gap: 4px;
        }
        .action-edit:hover {
          background: #dbeafe;
          border-color: #93c5fd;
          transform: translateY(-1px);
        }
        .action-delete {
          background: transparent;
          border: none;
          color: var(--gray-400);
          cursor: pointer;
          font-size: 18px;
          padding: 4px 6px;
          border-radius: 6px;
          transition: 0.15s;
        }
        .action-delete:hover {
          background: #fee2e2;
          color: #ef4444;
        }
      `}</style>
    </Layout>
  );
} 