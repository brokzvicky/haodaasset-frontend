import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
// import {useref} from "react";
import {
  Router, Network, Shield, Wifi, Server, HardDrive, Printer, Lock,
  Plus, X, Search, RefreshCw, Eye, EyeOff, Copy, Pencil, Trash2,
  ChevronDown, ChevronUp, Check, AlertTriangle, KeyRound, MoreVertical,
  SlidersHorizontal, ShieldCheck, Unlock, TimerReset,
} from "lucide-react";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import CredentialUnlockDialog from "../components/CredentialUnlockDialog";
import "./NetworkCredentials.css";

const API = "https://haodaasset-backend-1.onrender.com";

const DEVICE_TYPES = [
  "Router", "Switch", "Firewall", "Access Point", "Server", "NAS",
  "Printer", "VPN Gateway", "Other",
];

const DEVICE_STATUSES = ["Active", "Inactive", "Maintenance"];
const LOCATIONS = [
  "Chennai - Kilpauk",
  "Chennai - Chetpet",
  "Mumbai",
];

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

// ── Status pill ────────────────────────────────────────────────────
function DeviceStatusPill({ status }) {
  const cls = {
    Active: "active",
    Inactive: "inactive",
    Maintenance: "maintenance",
  }[status] || "inactive";

  return (
    <span className={`netcred-status-pill ${cls}`}>
      <span className="dot" />
      {status}
    </span>
  );
}

// ── Device type icon ───────────────────────────────────────────────
function DeviceTypeIcon({ type, size = 12 }) {
  const Icon = DEVICE_TYPE_ICON[type] || Network;
  return <Icon size={size} />;
}

// ── Date helpers ───────────────────────────────────────────────────
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

// ── Skeleton row ───────────────────────────────────────────────────
const SkeletonRow = () => {
  const cell = (w = 80) => (
    <td>
      <div className="nc-skeleton" style={{ width: w }} />
    </td>
  );
  return (
    <tr>
      {cell(28)}{cell(120)}{cell(80)}{cell(90)}{cell(100)}
      {cell(90)}{cell(80)}{cell(70)}{cell(90)}{cell(90)}{cell(90)}{cell(24)}
    </tr>
  );
};

// ── Form section divider ───────────────────────────────────────────
function FormSection({ icon, label }) {
  return (
    <div className="netcred-form-section" style={{ marginTop: 24, marginBottom: 16 }}>
      {icon && <span style={{ color: "#3b82f6", display: "flex" }}>{icon}</span>}
      {label}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
export default function NetworkCredentials() {
  const toast = useToast();

  const [credentials, setCredentials]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  const [showForm, setShowForm]         = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [formErrors, setFormErrors]     = useState({});

  const [searchText, setSearchText]     = useState("");
  const [showFilters, setShowFilters]   = useState(false);
  const [typeFilter, setTypeFilter]     = useState("All");
  const [brandFilter, setBrandFilter]   = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [revealed, setRevealed]         = useState({});
  const [revealingId, setRevealingId]   = useState(null);
  const [deletingId, setDeletingId]     = useState(null);
  const [openMenuId, setOpenMenuId]     = useState(null);
  const [menuPos, setMenuPos]           = useState(null);
  const [copiedKey, setCopiedKey]       = useState(null);

  // ── Sensitive-credential unlock (OTP-gated, 60s window) ──────────
  const [unlocked, setUnlocked]                 = useState(false);
  const [unlockSecondsLeft, setUnlockSecondsLeft] = useState(0);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [pendingAction, setPendingAction]       = useState(null);

  // Restore unlock state on mount (e.g. after a refresh, if the 60s window is still live server-side).
  useEffect(() => {
    axios.get(`${API}/api/network/credential-access/status`)
      .then((r) => {
        if (r.data?.unlocked) {
          setUnlocked(true);
          setUnlockSecondsLeft(r.data.secondsRemaining || 0);
        }
      })
      .catch(() => {});
  }, []);

  // Tick the unlock countdown; auto re-lock (and re-mask everything) when it hits zero.
  useEffect(() => {
    if (!unlocked) return;
    const t = setInterval(() => {
      setUnlockSecondsLeft((s) => {
        if (s <= 1) {
          setUnlocked(false);
          setRevealed({});
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [unlocked]);

  /** Runs `action` immediately if already unlocked, otherwise opens the OTP dialog and queues it. */
  const requireUnlock = useCallback((action) => {
    if (unlocked) { action(); return; }
    setPendingAction(() => action);
    setShowUnlockDialog(true);
  }, [unlocked]);

  const handleUnlocked = (secondsRemaining) => {
    setUnlocked(true);
    setUnlockSecondsLeft(secondsRemaining || 60);
    setShowUnlockDialog(false);
    toast("Verified — credentials unlocked for 60 seconds.", "success");
    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      action();
    }
  };

  const closeUnlockDialog = () => {
    setShowUnlockDialog(false);
    setPendingAction(null);
  };

  const flashCopied = (key) => {
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 900);
  };

  // ── Data ──────────────────────────────────────────────────────
  const loadData = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/network`)
      .then((r) => { setCredentials(r.data); setError(""); })
      .catch(() => { setCredentials([]); setError("Couldn't load network credentials. Is the Spring Boot API running?"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => { setOpenMenuId(null); setMenuPos(null); };
    document.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openMenuId]);

  // ── Form ──────────────────────────────────────────────────────
  const field = (key) => ({
    value: form[key],
    onChange: (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      if (formErrors[key]) setFormErrors((f) => ({ ...f, [key]: undefined }));
    },
  });

  const openCreateForm = () => {
    setEditingId(null); setForm(EMPTY_FORM); setFormErrors({}); setShowForm(true);
  };
  const openEditForm = (cred) => {
    setEditingId(cred.id);
    setForm({
      deviceName: cred.deviceName || "", deviceType: cred.deviceType || "",
      brand: cred.brand || "", model: cred.model || "",
      ipAddress: cred.ipAddress || "", hostname: cred.hostname || "",
      username: cred.username || "", password: "", enablePassword: "",
      sshPort: cred.sshPort ?? "", webPort: cred.webPort ?? "",
      location: cred.location || "", vlan: cred.vlan || "",
      isp: cred.isp || "", notes: cred.notes || "",
      deviceStatus: cred.deviceStatus || "Active",
    });
    setFormErrors({}); setShowForm(true); setOpenMenuId(null);
  };
  const closeForm = () => {
    setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); setFormErrors({});
  };

  // ── Validate + save ───────────────────────────────────────────
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
    if (!validate()) { toast("Please fix the highlighted fields.", "error"); return; }
    const payload = {
      ...form,
      sshPort: form.sshPort === "" ? null : Number(form.sshPort),
      webPort: form.webPort === "" ? null : Number(form.webPort),
    };
    if (!payload.password) delete payload.password;
    if (!payload.enablePassword) delete payload.enablePassword;
    setSaving(true);
    const req = editingId
      ? axios.put(`${API}/api/network/${editingId}`, payload)
      : axios.post(`${API}/api/network`, payload);
    req
      .then(() => { toast(editingId ? "Credential updated." : "Credential added.", "success"); closeForm(); loadData(); })
      .catch((e) => toast(e.response?.data?.message || "Couldn't save credential.", "error"))
      .finally(() => setSaving(false));
  };

  // ── Delete ────────────────────────────────────────────────────
  const deleteCredential = (cred) => {
    setOpenMenuId(null);
    if (!window.confirm(`Permanently delete credentials for "${cred.deviceName}"? This cannot be undone.`)) return;
    setDeletingId(cred.id);
    axios.delete(`${API}/api/network/${cred.id}`)
      .then(() => {
        toast("Credential deleted.", "success");
        setRevealed((r) => { const n = { ...r }; delete n[cred.id]; return n; });
        loadData();
      })
      .catch(() => toast("Couldn't delete credential.", "error"))
      .finally(() => setDeletingId(null));
  };

  // ── Reveal password ───────────────────────────────────────────
  const togglePasswordVisible = (cred) => {
    setOpenMenuId(null);
    const cur = revealed[cred.id];
    if (cur?.visible) { setRevealed((r) => ({ ...r, [cred.id]: { ...cur, visible: false } })); return; }
    requireUnlock(() => {
      if (cur?.password !== undefined) { setRevealed((r) => ({ ...r, [cred.id]: { ...cur, visible: true } })); return; }
      setRevealingId(cred.id);
      axios.get(`${API}/api/network/${cred.id}/reveal-password`)
        .then((r) => setRevealed((rv) => ({ ...rv, [cred.id]: { password: r.data.value, visible: true } })))
        .catch((e) => toast(e.response?.data?.message || "Couldn't decrypt password.", "error"))
        .finally(() => setRevealingId(null));
    });
  };

  const copyUsername = (cred) => {
    setOpenMenuId(null);
    requireUnlock(async () => {
      try { await navigator.clipboard.writeText(cred.username || ""); flashCopied(`user-${cred.id}`); toast("Username copied.", "success"); }
      catch { toast("Couldn't copy to clipboard.", "error"); }
    });
  };

  const copyPassword = (cred) => {
    setOpenMenuId(null);
    requireUnlock(async () => {
      try {
        let pwd = revealed[cred.id]?.password;
        if (pwd === undefined) {
          setRevealingId(cred.id);
          const r = await axios.get(`${API}/api/network/${cred.id}/reveal-password`);
          pwd = r.data.value;
          setRevealed((rv) => ({ ...rv, [cred.id]: { password: pwd, visible: rv[cred.id]?.visible || false } }));
        }
        await navigator.clipboard.writeText(pwd || "");
        flashCopied(`pwd-${cred.id}`);
        toast("Password copied.", "success");
      } catch (e) { toast(e.response?.data?.message || "Couldn't copy password.", "error"); }
      finally { setRevealingId(null); }
    });
  };

  // ── Derived ───────────────────────────────────────────────────
  const uniqueBrands    = useMemo(() => ["All", ...new Set(credentials.map((c) => c.brand).filter(Boolean))], [credentials]);
  const uniqueLocations = useMemo(() => ["All", ...new Set(credentials.map((c) => c.location).filter(Boolean))], [credentials]);

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
    { label: "Total Devices",  value: counts.total,        icon: <Network size={18} />,  cardGradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)",   glow: "#3b82f640", type: null },
    { label: "Routers",        value: counts.routers,      icon: <Router size={18} />,   cardGradient: "linear-gradient(135deg,#60a5fa,#2563eb)",   glow: "#2563eb40", type: "Router" },
    { label: "Switches",       value: counts.switches,     icon: <Network size={18} />,  cardGradient: "linear-gradient(135deg,#a78bfa,#7c3aed)",   glow: "#7c3aed40", type: "Switch" },
    { label: "Firewalls",      value: counts.firewalls,    icon: <Shield size={18} />,   cardGradient: "linear-gradient(135deg,#f87171,#dc2626)",   glow: "#ef444440", type: "Firewall" },
    { label: "Access Points",  value: counts.accessPoints, icon: <Wifi size={18} />,     cardGradient: "linear-gradient(135deg,#fbbf24,#d97706)",   glow: "#f59e0b40", type: "Access Point" },
    { label: "Servers",        value: counts.servers,      icon: <Server size={18} />,   cardGradient: "linear-gradient(135deg,#34d399,#059669)",   glow: "#10b98140", type: "Server" },
  ];

  const activeFilterCount = [typeFilter, brandFilter, locationFilter, statusFilter].filter((v) => v !== "All").length;
  const clearAllFilters   = () => { setSearchText(""); setTypeFilter("All"); setBrandFilter("All"); setLocationFilter("All"); setStatusFilter("All"); };

  // ── Layout title ──────────────────────────────────────────────
  const pageTitle = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <span className="netcred-title-icon">
        <ShieldCheck size={17} />
      </span>
      <span>
        <span className="netcred-title-accent">Network Credentials</span>
        <span className="netcred-vault-pill">
          <Lock size={10} /> Encrypted vault
        </span>
      </span>
    </span>
  );

  return (
    <>
    <Layout
      title={pageTitle}
      subtitle="Securely manage IT infrastructure device access"
      actions={
        <button
          className="btn btn-primary"
          onClick={showForm && !editingId ? closeForm : openCreateForm}
          style={{ display: "flex", alignItems: "center", gap: 7, borderRadius: 10, padding: "8px 16px", fontWeight: 600 }}
        >
          {showForm && !editingId ? <X size={15} /> : <Plus size={15} />}
          {showForm && !editingId ? "Cancel" : "Add Credential"}
        </button>
      }
    >
      <div className="netcred-page">
      {/* ── Error banner ── */}
      {error && (
        <div className="netcred-error-banner">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* ── Unlock status banner ── */}
      {unlocked && (
        <div className="netcred-unlock-banner">
          <Unlock size={14} />
          Sensitive credentials unlocked — auto-locks in {unlockSecondsLeft}s
          <button
            className="netcred-unlock-banner-btn"
            onClick={() => { setUnlocked(false); setRevealed({}); axios.post(`${API}/api/network/credential-access/lock`).catch(() => {}); }}
          >
            <TimerReset size={12} /> Lock now
          </button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="kpi-row kpi-row-6 stagger-in" style={{ marginBottom: 28 }}>
        {kpis.map((k) => {
          const active = k.type && typeFilter === k.type;
          return (
            <div
              key={k.label}
              className={`kpi-card-vivid ${k.type ? "clickable" : ""} ${active ? "is-active" : ""}`}
              onClick={k.type ? () => setTypeFilter(active ? "All" : k.type) : undefined}
              title={k.type ? (active ? `Showing ${k.type} only — click to clear` : `Filter to ${k.type}`) : undefined}
              style={{
                background: k.cardGradient,
                boxShadow: active
                  ? `0 0 0 3px #fff, 0 0 0 5px ${k.glow.replace("40","99")}, 0 12px 32px ${k.glow}`
                  : `0 8px 24px ${k.glow}`,
              }}
            >
              <div className="kpi-vivid-icon">{k.icon}</div>
              <div className="kpi-vivid-value">{loading ? "—" : k.value}</div>
              <div className="kpi-vivid-label">{k.label}</div>
              {active && <div className="kpi-vivid-active-badge">✓ Filtered</div>}
            </div>
          );
        })}
      </div>

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <div className="netcred-form-card">
          <div className="netcred-form-header">
            <div>
              <div className="netcred-form-title">
                {editingId ? "Edit Credential" : "Add Network Credential"}
              </div>
              <div className="netcred-form-subtitle">
                {editingId
                  ? "Leave password fields blank to keep the current password"
                  : "Fill in the device details to register a new credential"}
              </div>
            </div>
            <button className="icon-btn" onClick={closeForm} title="Close form" style={{ width: 32, height: 32 }}>
              <X size={15} />
            </button>
          </div>

          <div style={{ padding: "22px 24px" }}>
            <FormSection icon={<Server size={12} />} label="Device Information" />
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Device Name *</label>
                <input className="input" {...field("deviceName")} placeholder="e.g. HQ-Core-Switch-01" />
                {formErrors.deviceName && <div className="field-error"><AlertTriangle size={11} />{formErrors.deviceName}</div>}
              </div>
              <div className="field">
                <label className="field-label">Device Type *</label>
                <select className="input" {...field("deviceType")}>
                  <option value="">Select type…</option>
                  {DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                {formErrors.deviceType && <div className="field-error"><AlertTriangle size={11} />{formErrors.deviceType}</div>}
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
                {formErrors.ipAddress && <div className="field-error"><AlertTriangle size={11} />{formErrors.ipAddress}</div>}
              </div>
              <div className="field">
                <label className="field-label">Hostname</label>
                <input className="input" {...field("hostname")} placeholder="e.g. hq-sw-01.lan" />
              </div>
            </div>

            <FormSection icon={<Lock size={12} />} label="Access Credentials" />
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Username *</label>
                <input className="input" autoComplete="off" {...field("username")} placeholder="e.g. admin" />
                {formErrors.username && <div className="field-error"><AlertTriangle size={11} />{formErrors.username}</div>}
              </div>
              <div className="field">
                <label className="field-label">Password {editingId ? "" : "*"}</label>
                <input className="input" type="password" autoComplete="new-password" {...field("password")}
                  placeholder={editingId ? "Leave blank to keep current" : "Enter password"} />
                {formErrors.password && <div className="field-error"><AlertTriangle size={11} />{formErrors.password}</div>}
              </div>
              <div className="field">
                <label className="field-label">Enable Password</label>
                <input className="input" type="password" autoComplete="new-password" {...field("enablePassword")}
                  placeholder="Optional privileged-mode password" />
              </div>
              <div className="field">
                <label className="field-label">SSH Port</label>
                <input className="input" type="number" min="1" max="65535" {...field("sshPort")} placeholder="22" />
                {formErrors.sshPort && <div className="field-error"><AlertTriangle size={11} />{formErrors.sshPort}</div>}
              </div>
              <div className="field">
                <label className="field-label">Web Port</label>
                <input className="input" type="number" min="1" max="65535" {...field("webPort")} placeholder="443" />
                {formErrors.webPort && <div className="field-error"><AlertTriangle size={11} />{formErrors.webPort}</div>}
              </div>
              <div className="field">
                <label className="field-label">Status</label>
                <select className="input" {...field("deviceStatus")}>
                  {DEVICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <FormSection icon={<Network size={12} />} label="Location & Network" />
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Location</label>
                <select className="input" {...field("location")}>
                  <option value="">Select Location</option>
                  {LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                </select>
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

            <div style={{
              display: "flex", gap: 10, marginTop: 26, paddingTop: 20,
              borderTop: "1px solid #e0eeff",
            }}>
              <button
                className="btn btn-primary"
                onClick={saveCredential}
                disabled={saving}
                style={{ display: "flex", alignItems: "center", gap: 7, borderRadius: 9, padding: "8px 18px" }}
              >
                {saving ? (
                  <><RefreshCw size={14} style={{ animation: "spin 0.8s linear infinite" }} /> Saving…</>
                ) : editingId ? (
                  <><Check size={14} /> Save Changes</>
                ) : (
                  <><Plus size={14} /> Add Credential</>
                )}
              </button>
              <button className="btn btn-secondary" onClick={closeForm} style={{ borderRadius: 9 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Table card ── */}
      <div className="netcred-table-card">
        {/* Table card header */}
        <div className="netcred-table-header">
          <div>
            <div className="netcred-table-title">Device Credentials</div>
            <div className="netcred-table-subtitle">
              {loading ? "Loading…" : `${filtered.length} of ${credentials.length} devices`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search size={13} style={{
                position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
                color: "#94a3b8", pointerEvents: "none",
              }} />
              <input
                className="input"
                style={{
                  paddingLeft: 32, width: 220, height: 36,
                  border: "1.5px solid #dbeafe", borderRadius: 9,
                  background: "#f8fbff", fontSize: 13,
                  transition: "border-color 0.15s, box-shadow 0.15s, width 0.2s",
                }}
                placeholder="Search devices, IPs, hosts…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onFocus={(e) => {
                  e.target.style.width = "260px";
                  e.target.style.borderColor = "#3b82f6";
                  e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.12)";
                  e.target.style.background = "#ffffff";
                }}
                onBlur={(e) => {
                  e.target.style.width = "220px";
                  e.target.style.borderColor = "#dbeafe";
                  e.target.style.boxShadow = "none";
                  e.target.style.background = "#f8fbff";
                }}
              />
              {searchText && (
                <button className="netcred-search-clear" onClick={() => setSearchText("")} title="Clear search">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filters button */}
            <button
              className="btn btn-secondary"
              onClick={() => setShowFilters((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                position: "relative", height: 36, borderRadius: 9,
                border: showFilters ? "1.5px solid #3b82f6" : "1.5px solid #dbeafe",
                background: showFilters ? "#eff6ff" : "#f8fbff",
                color: showFilters ? "#1d4ed8" : undefined,
              }}
            >
              <SlidersHorizontal size={13} />
              Filters {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {activeFilterCount > 0 && (
                <span className="netcred-filter-badge">{activeFilterCount}</span>
              )}
            </button>

            {/* Refresh */}
            <button
              className="btn btn-secondary btn-icon"
              onClick={loadData}
              disabled={loading}
              title="Refresh"
              style={{
                height: 36, width: 36, borderRadius: 9,
                border: "1.5px solid #dbeafe", background: "#f8fbff",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <RefreshCw size={13} style={loading ? { animation: "spin 0.8s linear infinite" } : undefined} />
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="netcred-filter-bar">
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
              <button className="btn btn-ghost btn-sm" onClick={clearAllFilters} style={{ marginTop: 18, borderRadius: 8 }}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Table or states */}
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
          <div className="netcred-empty">
            <div className="netcred-empty-icon">
              {searchText || activeFilterCount > 0 ? <Search size={28} /> : <Network size={28} />}
            </div>
            <div className="netcred-empty-title">
              {searchText || activeFilterCount > 0 ? "No matching devices" : "No network devices yet"}
            </div>
            <div className="netcred-empty-sub">
              {searchText || activeFilterCount > 0
                ? "Try adjusting your search or clearing your filters"
                : "Click 'Add Credential' to register your first device"}
            </div>
            {(searchText || activeFilterCount > 0) && (
              <button className="btn btn-secondary" style={{ borderRadius: 9 }} onClick={clearAllFilters}>
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
                  <th style={{ minWidth: 170 }}>Password</th>
                  <th>Location</th>
                  <th>Last Updated</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cred, index) => {
                  const rev        = revealed[cred.id];
                  const isRevealing = revealingId === cred.id;
                  const isDeleting  = deletingId === cred.id;
                  return (
                    <tr
                      key={cred.id}
                      className={`netcred-row ${openMenuId === cred.id ? "is-active" : ""}`}
                      style={{ animationDelay: `${Math.min(index * 0.03, 0.25)}s` }}
                    >
                      {/* # */}
                      <td style={{ textAlign: "center", fontWeight: 700, color: "#cbd5e1", fontSize: 11.5 }}>
                        {index + 1}
                      </td>

                      {/* Device name */}
                      <td>
                        <div className="netcred-device-name">{cred.deviceName}</div>
                        <div className="netcred-device-sub">
                          <DeviceStatusPill status={cred.deviceStatus} />
                        </div>
                      </td>

                      {/* Type */}
                      <td>
                        <span className="netcred-type-tag">
                          <DeviceTypeIcon type={cred.deviceType} size={11} />
                          {cred.deviceType}
                        </span>
                      </td>

                      {/* Brand */}
                      <td style={{ color: "#334155", fontWeight: 500 }}>{cred.brand || "—"}</td>

                      {/* Model */}
                      <td style={{ color: "#475569" }}>{cred.model || "—"}</td>

                      {/* IP */}
                      <td>{cred.ipAddress ? <span className="netcred-mono">{cred.ipAddress}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>

                      {/* Hostname */}
                      <td>{cred.hostname ? <span className="netcred-mono">{cred.hostname}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>

                      {/* Username */}
                      <td>
                        <div className="netcred-secret">
                          <span style={{ fontWeight: 600, fontSize: 12.5, color: unlocked ? "#1e293b" : "#94a3b8", letterSpacing: unlocked ? 0 : 1 }}>
                            {unlocked ? cred.username : "••••••••"}
                          </span>
                          <button
                            className={"icon-btn" + (copiedKey === `user-${cred.id}` ? " is-copied" : "")}
                            title="Copy username"
                            onClick={() => copyUsername(cred)}
                          >
                            {copiedKey === `user-${cred.id}` ? <Check size={11} /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>

                      {/* Password */}
                      <td>
                        <div className="netcred-secret">
                          <Lock size={11} className="netcred-secret-lock" />
                          <span className={`netcred-secret-value ${isRevealing ? "is-pending" : !rev?.visible ? "is-masked" : ""}`}>
                            {isRevealing ? "Decrypting…" : rev?.visible ? rev.password : "••••••••"}
                          </span>
                          <button
                            className="icon-btn"
                            title={rev?.visible ? "Hide password" : "Show password"}
                            onClick={() => togglePasswordVisible(cred)}
                            disabled={isRevealing}
                          >
                            {rev?.visible ? <EyeOff size={11} /> : <Eye size={11} />}
                          </button>
                          <button
                            className={"icon-btn" + (copiedKey === `pwd-${cred.id}` ? " is-copied" : "")}
                            title="Copy password"
                            onClick={() => copyPassword(cred)}
                            disabled={isRevealing}
                          >
                            {copiedKey === `pwd-${cred.id}` ? <Check size={11} /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>

                      {/* Location */}
                      <td style={{ color: "#475569", fontSize: 12.5 }}>{cred.location || "—"}</td>

                      {/* Last updated */}
                      <td
                        title={`Created ${formatDateTime(cred.createdAt)} by ${cred.createdBy || "—"}`}
                        style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}
                      >
                        {formatDate(cred.updatedAt)}
                      </td>

                      {/* Actions */}
                      <td style={{ position: "relative" }}>
                        <button
                          className="icon-btn"
                          title="More actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenuId === cred.id) {
                              setOpenMenuId(null);
                              setMenuPos(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const menuWidth = 196;
                              setMenuPos({
                                top: rect.bottom + 8,
                                left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
                              });
                              setOpenMenuId(cred.id);
                            }
                          }}
                          disabled={isDeleting}
                          style={openMenuId === cred.id ? { background: "#dbeafe", color: "#2563eb" } : undefined}
                        >
                          <MoreVertical size={14} />
                        </button>
                        {openMenuId === cred.id && menuPos && createPortal(
                          <div
                            className="netcred-menu"
                            style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button className="netcred-menu-item" onClick={() => { openEditForm(cred); setOpenMenuId(null); setMenuPos(null); }}>
                              <Pencil size={13} /> Edit
                            </button>
                            <button className="netcred-menu-item" onClick={() => { togglePasswordVisible(cred); setOpenMenuId(null); setMenuPos(null); }}>
                              {rev?.visible ? <EyeOff size={13} /> : <Eye size={13} />}
                              {rev?.visible ? "Hide Password" : "Show Password"}
                            </button>
                            <button className="netcred-menu-item" onClick={() => { copyPassword(cred); setOpenMenuId(null); setMenuPos(null); }}>
                              <KeyRound size={13} /> Copy Password
                            </button>
                            <div className="netcred-menu-divider" />
                            <button className="netcred-menu-item danger" onClick={() => { deleteCredential(cred); setOpenMenuId(null); setMenuPos(null); }}>
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>,
                          document.body
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
      </div>
    </Layout>

      {showUnlockDialog && (
        <CredentialUnlockDialog onUnlocked={handleUnlocked} onClose={closeUnlockDialog} />
      )}
    </>
  );
}
