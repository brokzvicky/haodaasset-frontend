import React, { useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  Router, Network, Shield, Wifi, Server, HardDrive, Printer, Lock,
  Plus, X, Search, RefreshCw, Eye, EyeOff, Copy, Pencil, Trash2,
  Check, AlertTriangle, MoreVertical,
  ShieldCheck, Unlock, TimerReset, Download,
  ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Square,
  ShieldAlert, KeyRound, RotateCw, Activity,
  Cable, FileClock, Paperclip, ChevronLeft, ChevronRight,
} from "lucide-react";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import CredentialUnlockDialog from "../components/CredentialUnlockDialog";
import CountUp from "../components/CountUp";
import "./NetworkCredentials.css";
import "../components/DetailDrawer.css";

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

// ── Derived security metrics (computed from real fields only — no invented data) ──
// "Rotation health" is derived from how long it's been since a credential's
// password was last saved (updatedAt, falling back to createdAt).
const ROTATION_HEALTHY_DAYS = 90;
const ROTATION_DUE_DAYS     = 180;

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function rotationStatus(cred) {
  const age = daysSince(cred.updatedAt || cred.createdAt);
  if (age === null) return { cls: "unknown", label: "Unknown", age: null };
  if (age <= ROTATION_HEALTHY_DAYS) return { cls: "healthy", label: "Healthy", age };
  if (age <= ROTATION_DUE_DAYS)     return { cls: "due",     label: "Due Soon", age };
  return { cls: "overdue", label: "Rotation Overdue", age };
}

// Credential health = rotation age combined with device operational state —
// both are real fields, so the composite stays grounded in real data.
function credentialHealth(cred) {
  const rot = rotationStatus(cred);
  if (cred.deviceStatus === "Inactive" || rot.cls === "overdue") {
    return { cls: "critical", label: "Critical" };
  }
  if (cred.deviceStatus === "Maintenance" || rot.cls === "due") {
    return { cls: "risk", label: "At Risk" };
  }
  if (rot.cls === "unknown") return { cls: "unknown", label: "Unknown" };
  return { cls: "good", label: "Good" };
}

// Pure, module-level so it's stable across renders (no hook dependency needed).
const SORT_ACCESSORS = {
  device:   (c) => (c.deviceName || "").toLowerCase(),
  vendor:   (c) => (c.brand || "").toLowerCase(),
  ip:       (c) => (c.ipAddress || ""),
  location: (c) => (c.location || "").toLowerCase(),
  rotation: (c) => rotationStatus(c).age ?? -1,
  updated:  (c) => new Date(c.updatedAt || c.createdAt || 0).getTime(),
};

function RotationBadge({ cred }) {
  const rot = rotationStatus(cred);
  const text = rot.age === null ? rot.label : `${rot.label} · ${rot.age}d`;
  return <span className={`netcred-rotation-badge ${rot.cls}`}>{text}</span>;
}

function HealthBadge({ cred }) {
  const h = credentialHealth(cred);
  return <span className={`netcred-health-badge ${h.cls}`}>{h.label}</span>;
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
      {cell(18)}{cell(160)}{cell(100)}{cell(90)}{cell(110)}{cell(80)}{cell(80)}{cell(90)}{cell(70)}{cell(24)}
    </tr>
  );
};

// ── Device type → gradient (drives the drawer hero) ─────────────────
const DEVICE_TYPE_GRADIENT = {
  Router:        "linear-gradient(135deg,#2563eb,#1d4ed8)",
  Switch:        "linear-gradient(135deg,#7c3aed,#5b21b6)",
  Firewall:      "linear-gradient(135deg,#dc2626,#991b1b)",
  "Access Point":"linear-gradient(135deg,#d97706,#b45309)",
  Server:        "linear-gradient(135deg,#059669,#065f46)",
  NAS:           "linear-gradient(135deg,#0891b2,#0e7490)",
  Printer:       "linear-gradient(135deg,#475569,#1e293b)",
  "VPN Gateway": "linear-gradient(135deg,#334155,#0f172a)",
  Other:         "linear-gradient(135deg,#64748b,#334155)",
};

// ── Network Credential Detail Drawer ────────────────────────────────
const DRAWER_TABS = [
  { key: "overview",    label: "Overview",    icon: ShieldCheck },
  { key: "credential",  label: "Credentials", icon: Lock },
  { key: "connection",  label: "Connection",  icon: Cable },
  { key: "security",    label: "Security",    icon: ShieldAlert },
  { key: "timeline",    label: "Timeline",    icon: Activity },
  { key: "audit",       label: "Audit",       icon: FileClock },
  { key: "attachments", label: "Files",       icon: Paperclip },
];

function NetworkDetailDrawer({
  cred, onClose, onEdit, onDelete,
  unlocked, revealed, revealingId, copiedKey,
  onTogglePassword, onCopyUsername, onCopyPassword,
}) {
  const [tab, setTab] = useState("overview");

  useEffect(() => { setTab("overview"); }, [cred]);

  if (!cred) return null;
  const gradient = DEVICE_TYPE_GRADIENT[cred.deviceType] || DEVICE_TYPE_GRADIENT.Other;
  const rev = revealed[cred.id];
  const isRevealing = revealingId === cred.id;
  const rot = rotationStatus(cred);
  

  return (
    <div className="detail-drawer-overlay" onClick={onClose}>
      <div className="detail-drawer nc-drawer" onClick={(e) => e.stopPropagation()}>

        {/* Hero */}
        <div className="detail-drawer-hero nc-drawer-hero" style={{ background: gradient }}>
          <button className="detail-drawer-close" onClick={onClose} aria-label="Close"><X size={15} /></button>
          <div className="detail-drawer-icon"><DeviceTypeIcon type={cred.deviceType} size={24} /></div>
          <h3 className="detail-drawer-name">{cred.deviceName}</h3>
          <div className="detail-drawer-sub">
            {cred.deviceType}{cred.brand ? ` · ${cred.brand}` : ""}{cred.model ? ` ${cred.model}` : ""}
          </div>
          <div className="detail-drawer-pills">
            <DeviceStatusPill status={cred.deviceStatus} />
          </div>
        </div>

        {/* Tab strip */}
        <div className="nc-drawer-tabs" role="tablist">
          {DRAWER_TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`nc-drawer-tab ${tab === t.key ? "is-active" : ""}`}
              onClick={() => setTab(t.key)}
              title={t.label}
            >
              <t.icon size={14} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="detail-drawer-body">

          {tab === "overview" && (
            <>
              <div className="detail-drawer-section">
                <div className="detail-drawer-section-title">Device Summary</div>
                <div className="detail-drawer-grid">
                  <div className="detail-drawer-stat">
                    <div className="detail-drawer-stat-label">Device Type</div>
                    <div className="detail-drawer-stat-value">{cred.deviceType || "—"}</div>
                  </div>
                  <div className="detail-drawer-stat">
                    <div className="detail-drawer-stat-label">Vendor / Model</div>
                    <div className="detail-drawer-stat-value">{cred.brand || "—"}{cred.model ? ` · ${cred.model}` : ""}</div>
                  </div>
                  <div className="detail-drawer-stat">
                    <div className="detail-drawer-stat-label">Location</div>
                    <div className="detail-drawer-stat-value">{cred.location || "—"}</div>
                  </div>
                  <div className="detail-drawer-stat">
                    <div className="detail-drawer-stat-label">Operational Status</div>
                    <div className="detail-drawer-stat-value"><DeviceStatusPill status={cred.deviceStatus} /></div>
                  </div>
                </div>
              </div>

              <div className="detail-drawer-section">
                <div className="detail-drawer-section-title">Credential Health</div>
                <div className="detail-drawer-grid">
                  <div className="detail-drawer-stat">
                    <div className="detail-drawer-stat-label">Overall Health</div>
                    <div className="detail-drawer-stat-value"><HealthBadge cred={cred} /></div>
                  </div>
                  <div className="detail-drawer-stat">
                    <div className="detail-drawer-stat-label">Rotation</div>
                    <div className="detail-drawer-stat-value"><RotationBadge cred={cred} /></div>
                  </div>
                </div>
              </div>

              {cred.notes && (
                <div className="detail-drawer-section" style={{ marginBottom: 4 }}>
                  <div className="detail-drawer-section-title">Notes</div>
                  <div className="detail-drawer-notes">{cred.notes}</div>
                </div>
              )}
            </>
          )}

          {tab === "credential" && (
            <div className="detail-drawer-section" style={{ marginBottom: 4 }}>
              <div className="detail-drawer-section-title"><Lock size={11} /> Access Credentials</div>

              <div className="detail-drawer-secret">
                <span className="detail-drawer-secret-label">Username</span>
                <span className="detail-drawer-secret-value">
                  {unlocked ? cred.username : "••••••••"}
                </span>
                <div className="detail-drawer-secret-actions">
                  <button
                    className={"detail-drawer-icon-btn" + (copiedKey === `user-${cred.id}` ? " is-copied" : "")}
                    title="Copy username"
                    onClick={() => onCopyUsername(cred)}
                  >
                    {copiedKey === `user-${cred.id}` ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="detail-drawer-secret">
                <span className="detail-drawer-secret-label">Password</span>
                <span className="detail-drawer-secret-value">
                  {isRevealing ? "Decrypting…" : rev?.visible ? rev.password : "••••••••"}
                </span>
                <div className="detail-drawer-secret-actions">
                  <button
                    className="detail-drawer-icon-btn"
                    title={rev?.visible ? "Hide password" : "Show password"}
                    onClick={() => onTogglePassword(cred)}
                    disabled={isRevealing}
                  >
                    {rev?.visible ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button
                    className={"detail-drawer-icon-btn" + (copiedKey === `pwd-${cred.id}` ? " is-copied" : "")}
                    title="Copy password"
                    onClick={() => onCopyPassword(cred)}
                    disabled={isRevealing}
                  >
                    {copiedKey === `pwd-${cred.id}` ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              {!unlocked && (
                <div style={{ fontSize: 11.5, color: "var(--gray-400)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Lock size={11} /> Verify identity to reveal or copy credentials
                </div>
              )}
            </div>
          )}

          {tab === "connection" && (
            <div className="detail-drawer-section" style={{ marginBottom: 4 }}>
              <div className="detail-drawer-section-title">Network</div>
              <div className="detail-drawer-grid">
                <div className="detail-drawer-stat">
                  <div className="detail-drawer-stat-label">IP Address</div>
                  <div className="detail-drawer-stat-value">{cred.ipAddress || "—"}</div>
                </div>
                <div className="detail-drawer-stat">
                  <div className="detail-drawer-stat-label">Hostname</div>
                  <div className="detail-drawer-stat-value">{cred.hostname || "—"}</div>
                </div>
                <div className="detail-drawer-stat">
                  <div className="detail-drawer-stat-label">VLAN</div>
                  <div className="detail-drawer-stat-value">{cred.vlan || "—"}</div>
                </div>
                <div className="detail-drawer-stat">
                  <div className="detail-drawer-stat-label">ISP</div>
                  <div className="detail-drawer-stat-value">{cred.isp || "—"}</div>
                </div>
                <div className="detail-drawer-stat">
                  <div className="detail-drawer-stat-label">SSH Port</div>
                  <div className="detail-drawer-stat-value">{cred.sshPort || "—"}</div>
                </div>
                <div className="detail-drawer-stat">
                  <div className="detail-drawer-stat-label">Web Port</div>
                  <div className="detail-drawer-stat-value">{cred.webPort || "—"}</div>
                </div>
              </div>
            </div>
          )}

          {tab === "security" && (
            <>
              <div className="detail-drawer-section">
                <div className="detail-drawer-section-title"><RotateCw size={11} /> Password Rotation</div>
                <div className="detail-drawer-grid">
                  <div className="detail-drawer-stat">
                    <div className="detail-drawer-stat-label">Rotation Health</div>
                    <div className="detail-drawer-stat-value"><RotationBadge cred={cred} /></div>
                  </div>
                  <div className="detail-drawer-stat">
                    <div className="detail-drawer-stat-label">Credential Age</div>
                    <div className="detail-drawer-stat-value">{rot.age === null ? "—" : `${rot.age} days`}</div>
                  </div>
                </div>
              </div>
              <div className="detail-drawer-section" style={{ marginBottom: 4 }}>
                <div className="detail-drawer-section-title"><ShieldCheck size={11} /> Vault</div>
                <div className="detail-drawer-grid">
                  <div className="detail-drawer-stat">
                    <div className="detail-drawer-stat-label">Encryption</div>
                    <div className="detail-drawer-stat-value">AES-256</div>
                  </div>
                  <div className="detail-drawer-stat">
                    <div className="detail-drawer-stat-label">Access</div>
                    <div className="detail-drawer-stat-value">{unlocked ? "Unlocked" : "Locked"}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "timeline" && (
            <div className="detail-drawer-section" style={{ marginBottom: 4 }}>
              <div className="detail-drawer-section-title"><Activity size={11} /> Timeline</div>
              <div className="netcred-timeline">
                <div className="netcred-timeline-item">
                  <span className="netcred-timeline-dot" />
                  <div>
                    <div className="netcred-timeline-label">Credential Created</div>
                    <div className="netcred-timeline-time">
                      {formatDateTime(cred.createdAt)}{cred.createdBy ? ` · ${cred.createdBy}` : ""}
                    </div>
                  </div>
                </div>
                <div className="netcred-timeline-item">
                  <span className="netcred-timeline-dot" />
                  <div>
                    <div className="netcred-timeline-label">Last Updated</div>
                    <div className="netcred-timeline-time">{formatDateTime(cred.updatedAt)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "audit" && (
            <div className="detail-drawer-empty">
              <FileClock size={16} />
              <span>Audit log integration isn't connected for this device yet.</span>
            </div>
          )}

          {tab === "attachments" && (
            <div className="detail-drawer-empty">
              <Paperclip size={16} />
              <span>No files attached to this credential yet.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="detail-drawer-footer">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Close</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onEdit(cred)}>
            <Pencil size={13} style={{ marginRight: 6 }} /> Edit
          </button>
          <button
            className="btn btn-secondary"
            style={{ color: "var(--danger)", borderColor: "var(--danger-border)" }}
            title="Delete credential"
            onClick={() => onDelete(cred)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [lastSyncAt, setLastSyncAt]     = useState(null);

  const [showForm, setShowForm]         = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [formErrors, setFormErrors]     = useState({});

  const [searchText, setSearchText]     = useState("");
  const [typeFilter, setTypeFilter]     = useState("All");
  const [brandFilter, setBrandFilter]   = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [rotationFilter, setRotationFilter] = useState("All");

  const [sortKey, setSortKey]           = useState(null);
  const [sortDir, setSortDir]           = useState("asc");
  const [selectedIds, setSelectedIds]   = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [page, setPage]                 = useState(1);
  const PAGE_SIZE = 10;

  const [revealed, setRevealed]         = useState({});
  const [revealingId, setRevealingId]   = useState(null);
  const [deletingId, setDeletingId]     = useState(null);
  const [viewingCred, setViewingCred]   = useState(null);
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
      .then((r) => { setCredentials(r.data); setError(""); setLastSyncAt(new Date()); })
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
      .filter((c) => statusFilter === "All" || c.deviceStatus === statusFilter)
      .filter((c) => rotationFilter === "All" || rotationStatus(c).cls === rotationFilter),
    [credentials, searchText, typeFilter, brandFilter, locationFilter, statusFilter, rotationFilter]
  );

  // ── Sorting (client-side, over the already-filtered set) ─────────
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const acc = SORT_ACCESSORS[sortKey];
    const arr = [...filtered].sort((a, b) => {
      const av = acc(a), bv = acc(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    if (sortDir === "desc") arr.reverse();
    return arr;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); return; }
    if (sortDir === "asc") { setSortDir("desc"); return; }
    setSortKey(null); setSortDir("asc");
  };

  // ── Pagination (client-side, over the sorted+filtered set) ───────
  useEffect(() => { setPage(1); }, [searchText, typeFilter, brandFilter, locationFilter, statusFilter, rotationFilter, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage]
  );
  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown size={11} className="netcred-sort-icon" />;
    return sortDir === "asc" ? <ArrowUp size={11} className="netcred-sort-icon active" /> : <ArrowDown size={11} className="netcred-sort-icon active" />;
  };

  const counts = useMemo(() => ({
    total: credentials.length,
    routers: credentials.filter((c) => c.deviceType === "Router").length,
    switches: credentials.filter((c) => c.deviceType === "Switch").length,
    firewalls: credentials.filter((c) => c.deviceType === "Firewall").length,
    accessPoints: credentials.filter((c) => c.deviceType === "Access Point").length,
    servers: credentials.filter((c) => c.deviceType === "Server").length,
    active: credentials.filter((c) => c.deviceStatus === "Active").length,
    inactive: credentials.filter((c) => c.deviceStatus === "Inactive").length,
    maintenance: credentials.filter((c) => c.deviceStatus === "Maintenance").length,
    routersActive: credentials.filter((c) => c.deviceType === "Router" && c.deviceStatus === "Active").length,
    routersInactive: credentials.filter((c) => c.deviceType === "Router" && c.deviceStatus !== "Active").length,
  }), [credentials]);

  // ── Executive / security metrics — all derived from real fields ──
  const rotationBuckets = useMemo(() => {
    const b = { healthy: 0, due: 0, overdue: 0, unknown: 0 };
    credentials.forEach((c) => { b[rotationStatus(c).cls]++; });
    return b;
  }, [credentials]);

  const avgCredentialAgeDays = useMemo(() => {
    const ages = credentials.map((c) => daysSince(c.updatedAt || c.createdAt)).filter((a) => a !== null);
    if (!ages.length) return null;
    return Math.round(ages.reduce((s, a) => s + a, 0) / ages.length);
  }, [credentials]);

  const lastRotationDate = useMemo(() => {
    const ts = credentials.map((c) => c.updatedAt).filter(Boolean).map((d) => new Date(d).getTime()).filter((n) => !Number.isNaN(n));
    return ts.length ? new Date(Math.max(...ts)) : null;
  }, [credentials]);

  const newLast30Days = useMemo(() =>
    credentials.filter((c) => { const a = daysSince(c.createdAt); return a !== null && a <= 30; }).length,
    [credentials]
  );

  const rotationCompliancePct = credentials.length
    ? Math.round((rotationBuckets.healthy / credentials.length) * 100)
    : 100;

  const activeFilterCount = [typeFilter, brandFilter, locationFilter, statusFilter, rotationFilter].filter((v) => v !== "All").length;
  const clearAllFilters   = () => { setSearchText(""); setTypeFilter("All"); setBrandFilter("All"); setLocationFilter("All"); setStatusFilter("All"); setRotationFilter("All"); };

  // ── Selection + bulk actions ───────────────────────────────────
  const toggleSelectOne = (id) => {
    setSelectedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const allVisibleSelected = paged.length > 0 && paged.every((c) => selectedIds.has(c.id));
  const toggleSelectAll = () => {
    setSelectedIds((s) => {
      const n = new Set(s);
      if (allVisibleSelected) { paged.forEach((c) => n.delete(c.id)); return n; }
      paged.forEach((c) => n.add(c.id));
      return n;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const bulkDeleteSelected = () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!window.confirm(`Permanently delete ${ids.length} selected credential${ids.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setBulkDeleting(true);
    Promise.allSettled(ids.map((id) => axios.delete(`${API}/api/network/${id}`)))
      .then((results) => {
        const okCount = results.filter((r) => r.status === "fulfilled").length;
        toast(`${okCount} of ${ids.length} credential(s) deleted.`, okCount === ids.length ? "success" : "error");
        clearSelection();
        loadData();
      })
      .finally(() => setBulkDeleting(false));
  };

  // ── Export CSV (client-side, real data only — no secrets exported) ──
  const exportCSV = () => {
    const cols = ["deviceName", "deviceType", "brand", "model", "ipAddress", "hostname",
      "location", "vlan", "isp", "deviceStatus", "username", "createdAt", "updatedAt"];
    const rows = [cols.join(",")];
    sorted.forEach((c) => {
      rows.push(cols.map((k) => {
        const v = c[k] == null ? "" : String(c[k]).replace(/"/g, '""');
        return /[",\n]/.test(v) ? `"${v}"` : v;
      }).join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `network-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("Exported CSV (credentials/secrets excluded).", "success");
  };

  // ── Single-record download (metadata only, no secrets) ───────────
  const downloadCredential = (cred) => {
    setOpenMenuId(null);
    const { password, enablePassword, ...safe } = cred;
    const blob = new Blob([JSON.stringify(safe, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(cred.deviceName || "device").replace(/\s+/g, "-")}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const copyIp = async (cred) => {
    setOpenMenuId(null);
    if (!cred.ipAddress) { toast("No IP address on record.", "error"); return; }
    try { await navigator.clipboard.writeText(cred.ipAddress); toast("IP address copied.", "success"); }
    catch { toast("Couldn't copy to clipboard.", "error"); }
  };

  const rotatePassword = (cred) => {
    setOpenMenuId(null);
    openEditForm(cred);
    toast("Enter and save a new password below to complete the rotation.", "success");
  };

  // ── Executive KPI row — exactly four, each metric appears once ────
  const attentionCount = counts.inactive + rotationBuckets.overdue;

  const kpis = [
    {
      key: "devices", label: "Managed Devices", icon: <Network size={16} />,
      value: counts.total,
      sub: `${counts.active} online`,
      trend: newLast30Days > 0 ? { dir: "up", text: `+${newLast30Days} in 30d` } : null,
    },
    {
      key: "health", label: "Credential Health", icon: <ShieldCheck size={16} />,
      value: `${rotationCompliancePct}%`,
      sub: "rotation compliant",
      trend: { dir: rotationCompliancePct >= 80 ? "up" : "down", text: rotationCompliancePct >= 80 ? "Healthy" : "Below target" },
    },
    {
      key: "rotation", label: "Rotation Status", icon: <RotateCw size={16} />,
      value: rotationBuckets.due + rotationBuckets.overdue,
      sub: "devices due or overdue",
      trend: { dir: rotationBuckets.overdue > 0 ? "down" : "up", text: lastRotationDate ? `Last ${formatDate(lastRotationDate)}` : "No data" },
    },
    {
      key: "attention", label: "Attention Required", icon: <ShieldAlert size={16} />,
      value: attentionCount,
      sub: `${counts.inactive} offline · ${rotationBuckets.overdue} overdue`,
      trend: { dir: attentionCount > 0 ? "down" : "up", text: attentionCount > 0 ? "Needs review" : "All clear" },
    },
  ];

  // ── Layout title ──────────────────────────────────────────────
  const pageTitle = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <span className="netcred-title-icon">
        <ShieldCheck size={17} />
      </span>
      <span>
        <span className="netcred-title-accent">Network Credentials</span>
      </span>
    </span>
  );

  return (
    <>
    <Layout
      title={pageTitle}
      subtitle="Securely manage encrypted infrastructure credentials"
    >
      <div className="netcred-page">

      {/* ── 1. Elegant workspace header ── */}
      <div className="nc-hero">
        <div className="nc-hero-text">
          <h1 className="nc-hero-title">Network Credentials</h1>
          <p className="nc-hero-desc">Find a device, check its credential health, and act — all in one place.</p>
        </div>

        <div className="nc-hero-actions">
          <div className="nc-hero-search">
            <Search size={14} className="nc-hero-search-icon" />
            <input
              className="nc-hero-search-input"
              placeholder="Search devices, IPs, hosts…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {searchText && (
              <button className="netcred-search-clear" onClick={() => setSearchText("")} title="Clear search">
                <X size={12} />
              </button>
            )}
          </div>

          <button className="nc-hero-icon-btn" onClick={loadData} disabled={loading} title="Refresh">
            <RefreshCw size={14} style={loading ? { animation: "spin 0.8s linear infinite" } : undefined} />
          </button>
          <button className="nc-hero-icon-btn" onClick={exportCSV} disabled={loading || sorted.length === 0} title="Export CSV">
            <Download size={14} />
          </button>

          <button
            className="btn btn-primary nc-hero-add-btn"
            onClick={showForm && !editingId ? closeForm : openCreateForm}
          >
            {showForm && !editingId ? <X size={15} /> : <Plus size={15} />}
            {showForm && !editingId ? "Cancel" : "Add Credential"}
          </button>
        </div>
      </div>

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

      {/* ── 2. Compact operational summary — essential metrics only, one row ── */}
      <div className="nc-summary-bar">
        {kpis.map((k, i) => (
          <React.Fragment key={k.key}>
            {i > 0 && <span className="nc-summary-divider" aria-hidden="true" />}
            <div className="nc-summary-stat">
              <span className="nc-summary-icon">{k.icon}</span>
              <div className="nc-summary-text">
                <div className="nc-summary-value">
                  {loading ? "—" : typeof k.value === "number" ? <CountUp value={k.value} /> : k.value}
                </div>
                <div className="nc-summary-label">{k.label}</div>
              </div>
            </div>
          </React.Fragment>
        ))}
        <div className="nc-summary-spacer" />
        <div className="nc-summary-caption">
          {unlocked && <span className="nc-summary-caption-item nc-summary-caption-live"><Unlock size={11} /> Vault unlocked · {unlockSecondsLeft}s</span>}
          {avgCredentialAgeDays !== null && <span className="nc-summary-caption-item">Avg. age {avgCredentialAgeDays}d</span>}
          {lastSyncAt && <span className="nc-summary-caption-item">Synced {formatDateTime(lastSyncAt)}</span>}
        </div>
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

      {/* ── 3. Sticky filter toolbar + 4. Device table (the main focus) ── */}
      <div className="netcred-table-card">

        {/* Sticky filter toolbar — compact, single row, filters only */}
        <div className="nc-toolbar">
          <span className="nc-toolbar-label">Filter</span>

          <select className="input nc-toolbar-select" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} title="Vendor">
            {uniqueBrands.map((b) => <option key={b} value={b}>{b === "All" ? "All vendors" : b}</option>)}
          </select>

          <select className="input nc-toolbar-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} title="Category">
            <option value="All">All categories</option>
            {DEVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>

          <select className="input nc-toolbar-select" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} title="Location">
            {uniqueLocations.map((l) => <option key={l} value={l}>{l === "All" ? "All locations" : l}</option>)}
          </select>

          <select className="input nc-toolbar-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} title="Status">
            <option value="All">All statuses</option>
            {DEVICE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>

          <select className="input nc-toolbar-select" value={rotationFilter} onChange={(e) => setRotationFilter(e.target.value)} title="Rotation">
            <option value="All">All rotation</option>
            <option value="healthy">Healthy</option>
            <option value="due">Due Soon</option>
            <option value="overdue">Overdue</option>
          </select>

          {activeFilterCount > 0 && (
            <button className="btn btn-ghost btn-sm nc-toolbar-reset" onClick={clearAllFilters}>
              <RefreshCw size={12} style={{ marginRight: 5 }} /> Reset
            </button>
          )}

          <div className="nc-toolbar-spacer" />

          {!loading && <span className="nc-toolbar-count">{sorted.length} of {credentials.length} devices</span>}
        </div>

        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="netcred-bulk-bar">
            <span><CheckSquare size={14} /> {selectedIds.size} selected</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={clearSelection}>Clear</button>
              <button className="btn btn-secondary btn-sm" style={{ color: "var(--danger)" }} onClick={bulkDeleteSelected} disabled={bulkDeleting}>
                <Trash2 size={13} style={{ marginRight: 5 }} /> {bulkDeleting ? "Deleting…" : "Delete Selected"}
              </button>
            </div>
          </div>
        )}

        {/* Table or states */}
        {loading ? (
          <div className="table-wrap">
            <table className="data-table netcred-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Device</th>
                  <th>Vendor / Model</th>
                  <th>IP Address</th>
                  <th>Location</th>
                  <th>Credential Health</th>
                  <th>Rotation</th>
                  <th>Last Updated</th>
                  <th style={{ width: 90 }}>Actions</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        ) : sorted.length === 0 ? (
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
          <>
          <div className="table-wrap">
            <table className="data-table netcred-table">
              <thead>
                <tr>
                  <th style={{ width: 36, textAlign: "center" }}>
                    <button className="netcred-checkbox-btn" onClick={toggleSelectAll} title={allVisibleSelected ? "Deselect all" : "Select all"}>
                      {allVisibleSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                    </button>
                  </th>
                  <th data-sortable onClick={() => toggleSort("device")}>
                    <span className="netcred-th-sort">Device <SortIcon col="device" /></span>
                  </th>
                  <th data-sortable onClick={() => toggleSort("vendor")}>
                    <span className="netcred-th-sort">Vendor / Model <SortIcon col="vendor" /></span>
                  </th>
                  <th data-sortable onClick={() => toggleSort("ip")}>
                    <span className="netcred-th-sort">IP Address <SortIcon col="ip" /></span>
                  </th>
                  <th data-sortable onClick={() => toggleSort("location")}>
                    <span className="netcred-th-sort">Location <SortIcon col="location" /></span>
                  </th>
                  <th>Credential Health</th>
                  <th data-sortable onClick={() => toggleSort("rotation")}>
                    <span className="netcred-th-sort">Rotation <SortIcon col="rotation" /></span>
                  </th>
                  <th data-sortable onClick={() => toggleSort("updated")}>
                    <span className="netcred-th-sort">Last Updated <SortIcon col="updated" /></span>
                  </th>
                  <th style={{ width: 100 }}>Actions</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((cred, index) => {
                  const isDeleting  = deletingId === cred.id;
                  return (
                    <tr
                      key={cred.id}
                      className={`netcred-row ${openMenuId === cred.id ? "is-active" : ""} ${selectedIds.has(cred.id) ? "is-selected" : ""}`}
                      style={{ animationDelay: `${Math.min(index * 0.03, 0.25)}s` }}
                    >
                      {/* Select */}
                      <td style={{ textAlign: "center" }}>
                        <button className="netcred-checkbox-btn" onClick={() => toggleSelectOne(cred.id)} title="Select row">
                          {selectedIds.has(cred.id) ? <CheckSquare size={15} /> : <Square size={15} />}
                        </button>
                      </td>

                      {/* Device */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                            background: DEVICE_TYPE_GRADIENT[cred.deviceType] || DEVICE_TYPE_GRADIENT.Other,
                            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                          }}>
                            <DeviceTypeIcon type={cred.deviceType} size={15} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              className="netcred-device-name"
                              style={{ cursor: "pointer" }}
                              onClick={() => setViewingCred(cred)}
                              title="Click to view full details"
                            >
                              {cred.deviceName}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                              <span className="netcred-type-tag">{cred.deviceType}</span>
                              <DeviceStatusPill status={cred.deviceStatus} />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Vendor / Model */}
                      <td style={{ color: "#475569", fontSize: 12.5 }}>
                        {cred.brand || "—"}{cred.model ? ` · ${cred.model}` : ""}
                      </td>

                      {/* IP */}
                      <td>{cred.ipAddress ? <span className="netcred-mono">{cred.ipAddress}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>

                      {/* Location */}
                      <td style={{ color: "#475569", fontSize: 12.5 }}>{cred.location || "—"}</td>

                      {/* Credential Health */}
                      <td><HealthBadge cred={cred} /></td>

                      {/* Rotation */}
                      <td><RotationBadge cred={cred} /></td>

                      {/* Last updated */}
                      <td
                        title={`Created ${formatDateTime(cred.createdAt)} by ${cred.createdBy || "—"}`}
                        style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}
                      >
                        {formatDate(cred.updatedAt)}
                      </td>

                      {/* View */}
                      <td>
                        <button
                          className="netcred-view-btn"
                          onClick={() => setViewingCred(cred)}
                          title="View device details"
                        >
                          <Eye size={12} /> View
                        </button>
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
                              const menuHeight = 170;

                              const spaceBelow = window.innerHeight - rect.bottom;
                              const spaceAbove = rect.top;

                              const openUp = spaceBelow < menuHeight && spaceAbove > menuHeight;

                              setMenuPos({
                                top: openUp
                                  ? rect.top - menuHeight - 8
                                  : rect.bottom + 8,

                                left: Math.max(
                                  8,
                                  Math.min(
                                    rect.right - menuWidth,
                                    window.innerWidth - menuWidth - 8
                                  )
                                ),
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
                            style={{
                              position: "fixed",
                              top: menuPos.top,
                              left: menuPos.left,
                              zIndex: 99999,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button className="netcred-menu-item" onClick={() => { setViewingCred(cred); setOpenMenuId(null); setMenuPos(null); }}>
                              <Eye size={13} /> View Details
                            </button>
                            <button className="netcred-menu-item" onClick={() => { openEditForm(cred); setOpenMenuId(null); setMenuPos(null); }}>
                              <Pencil size={13} /> Edit
                            </button>
                            <button className="netcred-menu-item" onClick={() => copyIp(cred)}>
                              <Copy size={13} /> Copy IP Address
                            </button>
                            <button className="netcred-menu-item" onClick={() => rotatePassword(cred)}>
                              <KeyRound size={13} /> Rotate Password
                            </button>
                            <button className="netcred-menu-item" onClick={() => downloadCredential(cred)}>
                              <Download size={13} /> Download
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="nc-pagination">
              <span className="nc-pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <div className="nc-pagination-controls">
                <button
                  className="icon-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  title="Previous page"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  title="Next page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      </div>
    </Layout>

      {showUnlockDialog && (
        <CredentialUnlockDialog onUnlocked={handleUnlocked} onClose={closeUnlockDialog} />
      )}

      <NetworkDetailDrawer
        cred={viewingCred}
        onClose={() => setViewingCred(null)}
        onEdit={(cred) => { setViewingCred(null); openEditForm(cred); }}
        onDelete={(cred) => { setViewingCred(null); deleteCredential(cred); }}
        unlocked={unlocked}
        revealed={revealed}
        revealingId={revealingId}
        copiedKey={copiedKey}
        onTogglePassword={togglePasswordVisible}
        onCopyUsername={copyUsername}
        onCopyPassword={copyPassword}
      />
    </>
  );
}
