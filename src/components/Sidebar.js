import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import "./Sidebar.css";

/* ── SVG Icon Set ─────────────────────────────────────────────── */
const Ico = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  assets:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 20h8M12 18v2"/></svg>,
  employees: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  requests:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  reports:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  emailLogs: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>,
  sendAssetEmail: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/></svg>,
  settings:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  activity:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  serviceBilling: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  maintenance: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  pulse: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  profile:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  request:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  password:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  logout:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

const ADMIN_NAV = [
  { to: "/dashboard",      label: "Dashboard",      icon: "dashboard",  section: "MAIN"      },
  { to: "/assets",         label: "Assets",         icon: "assets",     section: "MAIN"      },
  { to: "/employees",      label: "Employees",      icon: "employees",  section: "MAIN"      },
  { to: "/asset-requests", label: "Asset Requests", icon: "requests",   section: "MAIN"      },
  { to: "/network-credentials", label: "Network Credentials", icon: "networkCredentials", section: "MAIN" },
  { to: "/service-billing", label: "Service Billing", icon: "serviceBilling", section: "MAIN" },
  { to: "/maintenance",    label: "Maintenance",    icon: "maintenance", section: "MAIN" },
  { to: "/pulse",          label: "Haoda Pulse",    icon: "pulse",      section: "MAIN" },
  { to: "/reports",        label: "Reports",        icon: "reports",    section: "ANALYTICS" },
  { to: "/email-logs",     label: "Email Logs",     icon: "emailLogs",  section: "ANALYTICS" },
  { to: "/send-asset-email", label: "Send Asset Email", icon: "sendAssetEmail", section: "ENTERPRISE" },
  { to: "/asset-email-logs", label: "Asset Email Logs", icon: "emailLogs",      section: "ENTERPRISE" },
  { to: "/settings",       label: "Settings",       icon: "settings",   section: "SYSTEM"    },
  { to: "/activity-log",   label: "Activity Log",   icon: "activity",   section: "SYSTEM"    },
];

const EMP_NAV = [
  { to: "/emp/dashboard", label: "My Dashboard",    icon: "dashboard", section: "MAIN"    },
  { to: "/emp/assets",    label: "My Assets",       icon: "assets",    section: "MAIN"    },
  { to: "/emp/profile",   label: "My Profile",      icon: "profile",   section: "MAIN"    },
  { to: "/emp/request",   label: "Asset Request",   icon: "request",   section: "MAIN"    },
  { to: "/emp/password",  label: "Change Password", icon: "password",  section: "ACCOUNT" },
];

function avatarColor(name) {
  const c = [
    "linear-gradient(135deg,#2563eb,#60a5fa)",
    "linear-gradient(135deg,#16a34a,#4ade80)",
    "linear-gradient(135deg,#7c3aed,#a78bfa)",
    "linear-gradient(135deg,#d97706,#fbbf24)",
    "linear-gradient(135deg,#be185d,#f472b6)",
  ];
  return c[(name || "A").charCodeAt(0) % c.length];
}

function initials(name) {
  return (name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Sidebar({ open = false, onClose, collapsed = false, onToggleCollapse }) {
  const { user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const notifCtx  = useNotifications();
  const unread    = notifCtx?.totalUnread ?? notifCtx?.unread ?? 0;

  const nav = user?.role === "admin" ? ADMIN_NAV : EMP_NAV;

  const handleLogout  = () => { logout(); navigate("/"); };
  const handleNavClick = () => { if (onClose) onClose(); };

  const sections = [...new Set(nav.map((n) => n.section))];

  return (
    <>
      <aside className={`sidebar ${open ? "sidebar-open" : ""} ${collapsed ? "sidebar-collapsed" : ""}`} aria-label="Main navigation">
        <div className="sidebar-logo">
  <div
    className="sidebar-logo-icon"
    style={{
      background: "#ffffff",
      padding: 5,
      overflow: "hidden",
    }}
  >
    <img
      src="/haoda-icon.png"
      alt="Haoda Group"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
      }}
    />
  </div>

  {!collapsed && (
    <div className="sidebar-logo-text">
      <div className="sidebar-logo-name">Haoda Asset</div>
      <div className="sidebar-logo-sub">IT Asset Management</div>
    </div>
  )}

  {onToggleCollapse && (
    <button
      type="button"
      className="sidebar-collapse-btn"
      onClick={onToggleCollapse}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-pressed={collapsed}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}>
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  )}
</div>

        <nav className="sidebar-nav">
          {sections.map((section) => (
            <React.Fragment key={section}>
              {!collapsed && <div className="sidebar-section-label">{section}</div>}
              {nav.filter((n) => n.section === section).map((item) => {
                const active =
                  location.pathname === item.to ||
                  (item.to !== "/dashboard" && item.to !== "/emp/dashboard" &&
                   location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`sidebar-item ${active ? "active" : ""}`}
                    onClick={handleNavClick}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="sidebar-item-icon" aria-hidden="true">
                      {item.icon === "networkCredentials"
                        ? <ShieldCheck size={16} strokeWidth={1.9} />
                        : Ico[item.icon]}
                    </span>
                    {!collapsed && item.label}
                    {item.to === "/asset-requests" && unread > 0 && (
                      <span className="sidebar-item-badge">{collapsed ? "" : (unread > 9 ? "9+" : unread)}</span>
                    )}
                  </Link>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" title={collapsed ? (user?.name || "User") : undefined}>
            <div className="sidebar-avatar" style={{ background: avatarColor(user?.name) }}>
              {initials(user?.name)}
            </div>
            {!collapsed && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user?.name || "User"}</div>
                <div className="sidebar-user-role">{user?.role === "admin" ? "Administrator" : user?.id || "Employee"}</div>
              </div>
            )}
          </div>
          <button className="sidebar-logout" onClick={handleLogout} title={collapsed ? "Sign Out" : undefined}>
            <span aria-hidden="true">{Ico.logout}</span> {!collapsed && "Sign Out"}
          </button>
        </div>
      </aside>

      <div className={`sidebar-scrim ${open ? "visible" : ""}`} onClick={onClose} aria-hidden="true" />
    </>
  );
}
