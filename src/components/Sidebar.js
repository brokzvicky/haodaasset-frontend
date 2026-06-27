import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import "./Sidebar.css";

const ADMIN_NAV = [
  { to: "/dashboard",      label: "Dashboard",       icon: "⊞", section: "MAIN"      },
  { to: "/assets",         label: "Assets",          icon: "💻", section: "MAIN"      },
  { to: "/employees",      label: "Employees",       icon: "👥", section: "MAIN"      },
  { to: "/asset-requests", label: "Asset Requests",  icon: "📋", section: "MAIN"      },
  { to: "/reports",        label: "Reports",         icon: "📊", section: "ANALYTICS" },
  { to: "/settings",       label: "Settings",        icon: "⚙️", section: "SYSTEM"    },
];

const EMP_NAV = [
  { to: "/emp/dashboard", label: "My Dashboard", icon: "⊞", section: "MAIN" },
  { to: "/emp/assets", label: "My Assets", icon: "💻", section: "MAIN" },
  { to: "/emp/profile", label: "My Profile", icon: "👤", section: "MAIN" },
  { to: "/emp/request", label: "Asset Request", icon: "📋", section: "MAIN" },
  { to: "/emp/password", label: "Change Password", icon: "🔒", section: "ACCOUNT" },
];

function avatarColor(name) {
  const colors = [
    "linear-gradient(135deg, #0052cc, #0747a6)",
    "linear-gradient(135deg, #00875a, #006644)",
    "linear-gradient(135deg, #5243aa, #403294)",
    "linear-gradient(135deg, #ff991f, #e37c00)",
    "linear-gradient(135deg, #de350b, #bf2600)",
  ];
  const idx = (name || "A").charCodeAt(0) % colors.length;
  return colors[idx];
}

function initials(name) {
  return (name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function Sidebar({ open = false, onClose }) {
  const { user, logout } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const notifCtx = useNotifications();
  const unread    = notifCtx?.unread ?? 0;

  const nav = user?.role === "admin" ? ADMIN_NAV : EMP_NAV;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  let sections = [...new Set(nav.map((n) => n.section))];

  return (
    <>
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`} aria-label="Main navigation">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">AT</div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-name">AssetTower</div>
            <div className="sidebar-logo-sub">IT Asset Management</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map((section) => (
            <React.Fragment key={section}>
              <div className="sidebar-section-label">{section}</div>
              {nav.filter((n) => n.section === section).map((item) => {
                const active = location.pathname === item.to ||
                  (item.to !== "/dashboard" && item.to !== "/emp/dashboard" && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`sidebar-item ${active ? "active" : ""}`}
                    onClick={handleNavClick}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="sidebar-item-icon" aria-hidden="true">{item.icon}</span>
                    {item.label}
                    {item.to === "/asset-requests" && unread > 0 && (
                      <span className="sidebar-item-badge">{unread > 9 ? "9+" : unread}</span>
                    )}
                  </Link>
                );
              })}
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div
              className="sidebar-avatar"
              style={{ background: avatarColor(user?.name) }}
            >
              {initials(user?.name)}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.name || "User"}</div>
              <div className="sidebar-user-role">
                {user?.role === "admin" ? "Administrator" : user?.id || "Employee"}
              </div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleLogout}>
            <span aria-hidden="true">⏻</span> Sign Out
          </button>
        </div>
      </aside>

      <div
        className={`sidebar-scrim ${open ? "visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  );
}