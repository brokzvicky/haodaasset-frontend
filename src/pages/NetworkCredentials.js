import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import {
  Router, Network, Shield, Wifi, Server, HardDrive, Printer, Lock,
  Plus, X, Search, RefreshCw, Eye, EyeOff, Copy, Pencil, Trash2,
  ChevronDown, ChevronUp, Check, AlertTriangle, KeyRound,
} from "lucide-react";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import "./NetworkCredentials.css";

const API = "https://haodaasset-backend-1.onrender.com";

const DEVICE_TYPES = [
  "Router", "Switch", "Firewall", "Access Point", "Server", "NAS",
  "Printer", "VPN Gateway", "Other",
];

const DEVICE_STATUSES = ["Active", "Inactive", "Maintenance"];

const DEVICE_TYPE_ICON = {
  Router: Router, Switch: Network, Firewall: Shield, "Access Point": Wifi,
  Server: Server, NAS: HardDrive, Printer: Printer, "VPN Gateway": Lock, Other: Network,
};

const EMPTY_FORM = {
  deviceName: "", deviceType: "", brand: "", model: "", ipAddress: "",
  hostname: "", username: "", password: "", enablePassword: "",
  sshPort: "", webPort: "", location: "", vlan: "", isp: "", notes: "",
  deviceStatus: "Active",
};

const STATUS_STYLE = {
  Active:      { bg: "var(--success-bg)", color: "var(--success)", dot: "var(--success)" },
  Inactive:    { bg: "var(--gray-100)",    color: "var(--gray-500)", dot: "var(--gray-400)" },
  Maintenance: { bg: "#ffedd5",            color: "#c2410c",         dot: "#c2410c" },
};

function DeviceStatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Active;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
      background: s.bg, color: s.color, fontSize: 11.5, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

function DeviceTypeIcon({ type, size = 14 }) {
  const Icon = DEVICE_TYPE_ICON[type] || Network;
  return <Icon size={size} />;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Skeleton loader row ──────────────────────────────────────────
const SkeletonRow = () => {
  const cell = (w = 80) => (
    <td>
      <div style={{
        height: 14, borderRadius: 6,
        background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
        backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite", width: w,
      }} />
    </td>
  );
  return <tr>{cell(28)}{cell(120)}{cell(70)}{cell(90)}{cell(100)}{cell(90)}{cell(80)}{cell(70)}{cell(90)}{cell(90)}{cell(90)}{cell(24)}</tr>;
};

export default function NetworkCredentials() {
  const toast = useToast();

  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const [searchText, setSearchText] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState("All");
  const [brandFilter, setBrandFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Per-row revealed-password cache: { [id]: { password, enablePassword } }
  const [revealed, setRevealed] = useState({});
  const [revealingId, setRevealingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  // ── Data loading ──────────────────────────────────────────────
  const loadData = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/network`)
      .then((r) => { setCredentials(r.data); setError(""); })
      .catch(() => { setCredentials([]); setError("Couldn't load network credentials. Is the Spring Boot API running?"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Close any open row-action menu when clicking elsewhere
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenuId]);

  // ── Form helpers ──────────────────────────────────────────────
  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (formErrors[key]) setFormErrors((f) => ({ ...f, [key]: undefined }));
    },
  });

  const openCreateForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowForm(true);
  };

  const openEditForm = (cred) => {
    setEditingId(cred.id);
    setForm({
      deviceName: cred.deviceName || "",
      deviceType: cred.deviceType || "",
      brand: cred.brand || "",
      model: cred.model || "",
      ipAddress: cred.ipAddress || "",
      hostname: cred.hostname || "",
      username: cred.username || "",
      password: "",        // intentionally blank — leaving blank keeps the existing password
      enablePassword: "",   // same for enable password
      sshPort: cred.sshPort ?? "",
      webPort: cred.webPort ?? "",
      location: cred.location || "",
      vlan: cred.vlan || "",
      isp: cred.isp || "",
      notes: cred.notes || "",
      deviceStatus: cred.deviceStatus || "Active",
    });
    setFormErrors({});
    setShowForm(true);
    setOpenMenuId(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  };

  // ── Validate + Save ──────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.deviceName.trim()) errs.deviceName = "Device name is required";
    if (!form.deviceType.trim()) errs.deviceType = "Device type is required";
    if (!form.username.trim()) errs.username = "Username is required";
    if (!editingId && !form.password.trim()) errs.password = "Password is required";
    if (form.ipAddress.trim()) {
      const ipv4 = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipv4.test(form.ipAddress.trim())) errs.ipAddress = "Enter a valid IPv4 address";
    }
    if (form.sshPort && (form.sshPort < 1 || form.sshPort > 65535)) errs.sshPort = "Port must be 1–65535";
    if (form.webPort && (form.webPort < 1 || form.webPort > 65535)) errs.webPort = "Port must be 1–65535";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveCredential = () => {
    if (!validate()) {
      toast("Please fix the highlighted fields.", "error");
      return;
    }

    const payload = {
      ...form,
      sshPort: form.sshPort === "" ? null : Number(form.sshPort),
      webPort: form.webPort === "" ? null : Number(form.webPort),
    };
    if (!payload.password) delete payload.password;
    if (!payload.enablePassword) delete payload.enablePassword;

    setSaving(true);
    const request = editingId
      ? axios.put(`${API}/api/network/${editingId}`, payload)
      : axios.post(`${API}/api/network`, payload);

    request
      .then(() => {
        toast(editingId ? "Credential updated." : "Credential added.", "success");
        closeForm();
        loadData();
      })
      .catch((err) => toast(err.response?.data?.message || "Couldn't save credential.", "error"))
      .finally(() => setSaving(false));
  };

  // ── Delete ──────────────────────────────────────────────────
  const deleteCredential = (cred) => {
    setOpenMenuId(null);
    if (!window.confirm(`Permanently delete credentials for "${cred.deviceName}"? This cannot be undone.`)) return;
    setDeletingId(cred.id);
    axios.delete(`${API}/api/network/${cred.id}`)
      .then(() => {
        toast("Credential deleted.", "success");
        setRevealed((r) => { const next = { ...r }; delete next[cred.id]; return next; });
        loadData();
      })
      .catch(() => toast("Couldn't delete credential.", "error"))
      .finally(() => setDeletingId(null));
  };

  // ── Reveal / hide password ───────────────────────────────────
  const togglePasswordVisible = (cred) => {
    setOpenMenuId(null);
    const current = revealed[cred.id];
    if (current?.visible) {
      setRevealed((r) => ({ ...r, [cred.id]: { ...current, visible: false } }));
      return;
    }
    if (current?.password !== undefined) {
      setRevealed((r) => ({ ...r, [cred.id]: { ...current, visible: true } }));
      return;
    }

    setRevealingId(cred.id);
    axios.get(`${API}/api/network/${cred.id}/reveal-password`)
      .then((r) => {
        setRevealed((rv) => ({ ...rv, [cred.id]: { password: r.data.value, visible: true } }));
      })
      .catch(() => toast("Couldn't decrypt password.", "error"))
      .finally(() => setRevealingId(null));
  };

  const copyUsername = async (cred) => {
    setOpenMenuId(null);
    try {
      await navigator.clipboard.writeText(cred.username || "");
      toast("Username copied to clipboard.", "success");
    } catch {
      toast("Couldn't copy to clipboard.", "error");
    }
  };

  const copyPassword = async (cred) => {
    setOpenMenuId(null);
    try {
      let pwd = revealed[cred.id]?.password;
      if (pwd === undefined) {
        setRevealingId(cred.id);
        const r = await axios.get(`${API}/api/network/${cred.id}/reveal-password`);
        pwd = r.data.value;
        setRevealed((rv) => ({ ...rv, [cred.id]: { password: pwd, visible: rv[cred.id]?.visible || false } }));
      }
      await navigator.clipboard.writeText(pwd || "");
      toast("Password copied to clipboard.", "success");
    } catch {
      toast("Couldn't copy password.", "error");
    } finally {
      setRevealingId(null);
    }
  };

  // ── Derived data ──────────────────────────────────────────────
  const uniqueBrands = useMemo(
    () => ["All", ...new Set(credentials.map((c) => c.brand).filter(Boolean))],
    [credentials]
  );
  const uniqueLocations = useMemo(
    () => ["All", ...new Set(credentials.map((c) => c.location).filter(Boolean))],
    [credentials]
  );

  const filtered = useMemo(() =>
    credentials
      .filter((c) => {
        const q = searchText.toLowerCase();
        if (!q) return true;
        return (
          (c.deviceName || "").toLowerCase().includes(q) ||
          (c.ipAddress || "").toLowerCase().includes(q) ||
          (c.hostname || "").toLowerCase().includes(q) ||
          (c.brand || "").toLowerCase().includes(q) ||
          (c.model || "").toLowerCase().includes(q) ||
          (c.location || "").toLowerCase().includes(q) ||
          (c.username || "").toLowerCase().includes(q)
        );
      })
      .filter((c) => typeFilter === "All" || c.deviceType === typeFilter)
      .filter((c) => brandFilter === "All" || c.brand === brandFilter)
      .filter((c) => locationFilter === "All" || c.location === locationFilter)
      .filter((c) => statusFilter === "All" || c.deviceStatus === statusFilter),
    [credentials, searchText, typeFilter, brandFilter, locationFilter, statusFilter]
  );

  const counts = useMemo(() => ({
    total: credentials.length,
    routers: credentials.filter((c) => c.deviceType === "Router").length,
    switches: credentials.filter((c) => c.deviceType === "Switch").length,
    firewalls: credentials.filter((c) => c.deviceType === "Firewall").length,
    accessPoints: credentials.filter((c) => c.deviceType === "Access Point").length,
    servers: credentials.filter((c) => c.deviceType === "Server").length,
  }), [credentials]);

  const kpis = [
    { label: "Total Devices", value: counts.total, icon: <Network size={18} />, color: "var(--primary)", bg: "var(--primary-50)", type: null },
    { label: "Routers", value: counts.routers, icon: <Router size={18} />, color: "#1d4ed8", bg: "#dbeafe", type: "Router" },
    { label: "Switches", value: counts.switches, icon: <Network size={18} />, color: "#7c3aed", bg: "#f3e8ff", type: "Switch" },
    { label: "Firewalls", value: counts.firewalls, icon: <Shield size={18} />, color: "#b91c1c", bg: "#fee2e2", type: "Firewall" },
    { label: "Access Points", value: counts.accessPoints, icon: <Wifi size={18} />, color: "#a16207", bg: "#fef9c3", type: "Access Point" },
    { label: "Servers", value: counts.servers, icon: <Server size={18} />, color: "#0f766e", bg: "#ccfbf1", type: "Server" },
  ];

  const activeFilterCount = [typeFilter, brandFilter, locationFilter, statusFilter].filter((v) => v !== "All").length;
  const clearAllFilters = () => {
    setSearchText(""); setTypeFilter("All"); setBrandFilter("All");
    setLocationFilter("All"); setStatusFilter("All");
  };

  return (
    <Layout
      title="Network Credentials"
      subtitle="Securely manage IT infrastructure device access"
      actions={
        <button className="btn btn-primary" onClick={openCreateForm} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {showForm && !editingId ? <X size={15} /> : <Plus size={15} />}
          {showForm && !editingId ? "Cancel" : "Add Credential"}
        </button>
      }
    >
      {error && (
        <div className="card" style={{
          marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2",
          padding: "12px 18px", fontSize: 13, color: "#991b1b",
          display: "flex", gap: 8, alignItems: "center",
        }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="kpi-row kpi-row-6" style={{ marginBottom: 28 }}>
        {kpis.map((k) => {
          const active = k.type && typeFilter === k.type;
          return (
            <div
              key={k.label}
              className={`kpi-card ${k.type ? "clickable" : ""}`}
              onClick={k.type ? () => setTypeFilter(active ? "All" : k.type) : undefined}
              style={{
                borderLeft: `4px solid ${k.color}`,
                boxShadow: active ? `0 0 0 2px ${k.color}30, var(--shadow-sm)` : undefined,
                borderColor: active ? `${k.color}40` : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="kpi-value" style={{ color: loading ? "var(--gray-300)" : k.color }}>
                    {loading ? "—" : k.value}
                  </div>
                  <div className="kpi-label" style={{ textTransform: "uppercase", fontSize: 10, letterSpacing: "0.05em", color: "var(--gray-400)" }}>
                    {k.label}
                  </div>
                </div>
                <div className="kpi-icon-wrapper" style={{ background: k.bg, color: k.color }}>{k.icon}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 28, animation: "fadeIn 0.2s ease" }}>
          <div className="card-header">
            <div>
              <div className="card-title">{editingId ? "Edit Credential" : "Add Network Credential"}</div>
              <div className="card-subtitle">
                {editingId
                  ? "Leave password fields blank to keep the current password"
                  : "Fill in the device details below"}
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-section-label">Device Information</div>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Device Name *</label>
                <input className="input" {...field("deviceName")} placeholder="e.g. HQ-Core-Switch-01" />
                {formErrors.deviceName && <div className="field-error">{formErrors.deviceName}</div>}
              </div>
              <div className="field">
                <label className="field-label">Device Type *</label>
                <select className="input" {...field("deviceType")}>
                  <option value="">Select type…</option>
                  {DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                {formErrors.deviceType && <div className="field-error">{formErrors.deviceType}</div>}
              </div>
              <div className="field">
                <label className="field-label">Brand</label>
                <input className="input" {...field("brand")} placeholder="e.g. Cisco, MikroTik, Fortinet" />
              </div>
              <div className="field">
                <label className="field-label">Model</label>
                <input className="input" {...field("model")} placeholder="e.g. Catalyst 2960" />
              </div>
              <div className="field">
                <label className="field-label">IP Address</label>
                <input className="input" {...field("ipAddress")} placeholder="e.g. 192.168.1.1" />
                {formErrors.ipAddress && <div className="field-error">{formErrors.ipAddress}</div>}
              </div>
              <div className="field">
                <label className="field-label">Hostname</label>
                <input className="input" {...field("hostname")} placeholder="e.g. hq-sw-01.lan" />
              </div>
            </div>

            <div className="form-section-label" style={{ marginTop: 20 }}>Access Credentials</div>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Username *</label>
                <input className="input" autoComplete="off" {...field("username")} placeholder="e.g. admin" />
                {formErrors.username && <div className="field-error">{formErrors.username}</div>}
              </div>
              <div className="field">
                <label className="field-label">Password {editingId ? "" : "*"}</label>
                <input className="input" type="password" autoComplete="new-password" {...field("password")}
                  placeholder={editingId ? "Leave blank to keep current" : "Enter password"} />
                {formErrors.password && <div className="field-error">{formErrors.password}</div>}
              </div>
              <div className="field">
                <label className="field-label">Enable Password</label>
                <input className="input" type="password" autoComplete="new-password" {...field("enablePassword")}
                  placeholder="Optional privileged-mode password" />
              </div>
              <div className="field">
                <label className="field-label">SSH Port</label>
                <input className="input" type="number" min="1" max="65535" {...field("sshPort")} placeholder="22" />
                {formErrors.sshPort && <div className="field-error">{formErrors.sshPort}</div>}
              </div>
              <div className="field">
                <label className="field-label">Web Port</label>
                <input className="input" type="number" min="1" max="65535" {...field("webPort")} placeholder="443" />
                {formErrors.webPort && <div className="field-error">{formErrors.webPort}</div>}
              </div>
              <div className="field">
                <label className="field-label">Status</label>
                <select className="input" {...field("deviceStatus")}>
                  {DEVICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-section-label" style={{ marginTop: 20 }}>Location & Network</div>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Location</label>
                <input className="input" {...field("location")} placeholder="e.g. Chennai HQ - Server Room" />
              </div>
              <div className="field">
                <label className="field-label">VLAN</label>
                <input className="input" {...field("vlan")} placeholder="e.g. VLAN 10" />
              </div>
              <div className="field">
                <label className="field-label">ISP</label>
                <input className="input" {...field("isp")} placeholder="e.g. Airtel Business" />
              </div>
              <div className="field" style={{ gridColumn: "span 3" }}>
                <label className="field-label">Notes</label>
                <input className="input" {...field("notes")} placeholder="Any additional notes" />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--gray-100)" }}>
              <button className="btn btn-primary" onClick={saveCredential} disabled={saving}>
                {saving ? "Saving…" : editingId ? <><Check size={15} /> Save Changes</> : <><Plus size={15} /> Add Credential</>}
              </button>
              <button className="btn btn-secondary" onClick={closeForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="card-title">Device Credentials</div>
            <div className="card-subtitle">
              {loading ? "Loading…" : `${filtered.length} of ${credentials.length} devices`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none" }} />
              <input
                className="input"
                style={{ paddingLeft: 34, width: 210 }}
                placeholder="Search devices, IPs, hosts…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              {searchText && (
                <button onClick={() => setSearchText("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", display: "flex" }}>
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setShowFilters((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}
            >
              Filters {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {activeFilterCount > 0 && (
                <span style={{
                  position: "absolute", top: -6, right: -6, background: "var(--primary)", color: "#fff",
                  fontSize: 10, fontWeight: 700, borderRadius: 999, minWidth: 16, height: 16,
                  display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px",
                }}>{activeFilterCount}</span>
              )}
            </button>
            <button className="btn btn-secondary btn-icon" onClick={loadData} disabled={loading} title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div style={{
            display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
            padding: "14px 20px", borderBottom: "1px solid var(--gray-100)", background: "var(--gray-50)",
          }}>
            <div className="field" style={{ minWidth: 150 }}>
              <label className="field-label">Device Type</label>
              <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="All">All types</option>
                {DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field" style={{ minWidth: 150 }}>
              <label className="field-label">Brand</label>
              <select className="input" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
                {uniqueBrands.map((b) => <option key={b} value={b}>{b === "All" ? "All brands" : b}</option>)}
              </select>
            </div>
            <div className="field" style={{ minWidth: 150 }}>
              <label className="field-label">Location</label>
              <select className="input" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
                {uniqueLocations.map((l) => <option key={l} value={l}>{l === "All" ? "All locations" : l}</option>)}
              </select>
            </div>
            <div className="field" style={{ minWidth: 150 }}>
              <label className="field-label">Status</label>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All statuses</option>
                {DEVICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={clearAllFilters} style={{ marginTop: 18 }}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="table-wrap">
            <table className="data-table netcred-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>#</th>
                  <th>Device Name</th><th>Type</th><th>Brand</th><th>Model</th>
                  <th>IP Address</th><th>Hostname</th><th>Username</th>
                  <th>Password</th><th>Location</th><th>Last Updated</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ opacity: 0.3 }}>
              {searchText || activeFilterCount > 0 ? <Search size={34} /> : <Network size={34} />}
            </div>
            <div className="empty-title">
              {searchText || activeFilterCount > 0 ? "No matching devices" : "No network devices yet"}
            </div>
            <div className="empty-sub">
              {searchText || activeFilterCount > 0
                ? "Try adjusting your search or filters"
                : "Click 'Add Credential' to register your first device"}
            </div>
            {(searchText || activeFilterCount > 0) && (
              <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={clearAllFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table netcred-table">
              <thead>
                <tr>
                  <th style={{ width: 36, textAlign: "center" }}>#</th>
                  <th>Device Name</th>
                  <th>Type</th>
                  <th>Brand</th>
                  <th>Model</th>
                  <th>IP Address</th>
                  <th>Hostname</th>
                  <th>Username</th>
                  <th style={{ minWidth: 160 }}>Password</th>
                  <th>Location</th>
                  <th>Last Updated</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cred, index) => {
                  const rev = revealed[cred.id];
                  const isRevealing = revealingId === cred.id;
                  const isDeleting = deletingId === cred.id;
                  return (
                    <tr key={cred.id} className="netcred-row">
                      <td style={{ textAlign: "center", fontWeight: 600, color: "var(--gray-400)", fontSize: 12 }}>{index + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--gray-900)", fontSize: 13.5 }}>{cred.deviceName}</div>
                        <div style={{ marginTop: 2 }}><DeviceStatusPill status={cred.deviceStatus} /></div>
                      </td>
                      <td>
                        <span className="tag tag-blue" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <DeviceTypeIcon type={cred.deviceType} size={12} /> {cred.deviceType}
                        </span>
                      </td>
                      <td style={{ color: "var(--gray-700)" }}>{cred.brand || "—"}</td>
                      <td style={{ color: "var(--gray-600)" }}>{cred.model || "—"}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{cred.ipAddress || "—"}</td>
                      <td className="mono" style={{ fontSize: 12 }}>{cred.hostname || "—"}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 500 }}>{cred.username}</span>
                          <button className="icon-btn" title="Copy username" onClick={() => copyUsername(cred)}>
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="mono" style={{ fontSize: 12, letterSpacing: rev?.visible ? "normal" : "2px", color: "var(--gray-700)" }}>
                            {isRevealing ? "Decrypting…" : rev?.visible ? rev.password : "••••••••"}
                          </span>
                          <button
                            className="icon-btn"
                            title={rev?.visible ? "Hide password" : "Show password"}
                            onClick={() => togglePasswordVisible(cred)}
                            disabled={isRevealing}
                          >
                            {rev?.visible ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                          <button className="icon-btn" title="Copy password" onClick={() => copyPassword(cred)} disabled={isRevealing}>
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>
                      <td style={{ color: "var(--gray-600)" }}>{cred.location || "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--gray-500)" }} title={`Created ${formatDateTime(cred.createdAt)} by ${cred.createdBy || "—"}`}>
                        {formatDate(cred.updatedAt)}
                      </td>
                      <td style={{ position: "relative" }}>
                        <button
                          className="icon-btn"
                          title="More actions"
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === cred.id ? null : cred.id); }}
                          disabled={isDeleting}
                        >
                          ⋯
                        </button>
                        {openMenuId === cred.id && (
                          <div className="netcred-menu" onClick={(e) => e.stopPropagation()}>
                            <button className="netcred-menu-item" onClick={() => openEditForm(cred)}>
                              <Pencil size={13} /> Edit
                            </button>
                            <button className="netcred-menu-item" onClick={() => togglePasswordVisible(cred)}>
                              {rev?.visible ? <EyeOff size={13} /> : <Eye size={13} />}
                              {rev?.visible ? "Hide Password" : "Show Password"}
                            </button>
                            <button className="netcred-menu-item" onClick={() => copyPassword(cred)}>
                              <KeyRound size={13} /> Copy Password
                            </button>
                            <div className="netcred-menu-divider" />
                            <button className="netcred-menu-item danger" onClick={() => deleteCredential(cred)}>
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
