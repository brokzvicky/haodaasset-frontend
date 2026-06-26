import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";

function initials(name) {
  return (name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
function avatarBg(name) {
  const colors = ["#2563eb","#16a34a","#7c3aed","#b45309","#be185d"];
  return colors[(name || "A").charCodeAt(0) % colors.length];
}

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const HelpIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default function Layout({ title, subtitle, children, actions }) {
  const { user } = useAuth();
  const isAdmin  = user?.role === "admin";
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" :
    now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="app-main">
        <header className="topbar">
          <button
            className="menu-toggle-btn"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <CloseIcon /> : <MenuIcon />}
          </button>

          <div className="topbar-title">
            <div className="topbar-page">{title}</div>
            {subtitle && <div className="topbar-sub">{subtitle}</div>}
          </div>

          <div className="topbar-actions">
            {isAdmin
              ? <NotificationBell />
              : (
                <button className="topbar-btn" title="Notifications">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </button>
              )
            }
            <button className="topbar-btn" title="Help">
              <HelpIcon />
            </button>
            <div
              className="topbar-avatar"
              title={`${greeting}, ${user?.name}`}
              style={{ background: avatarBg(user?.name) }}
            >
              {initials(user?.name)}
            </div>
          </div>
        </header>

        <main id="main-content" className="page-content fade-in">
          {actions && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
              {actions}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
