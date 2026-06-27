import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/AuthContext";
import { useLocation } from "react-router-dom";
import "./Layout.css";

function initials(name) {
  return (name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function avatarBg(name) {
  const colors = ["#0052cc", "#00875a", "#5243aa", "#ff5630", "#00b8d9"];
  return colors[(name || "A").charCodeAt(0) % colors.length];
}
<<<<<<< HEAD
=======
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
>>>>>>> bd771d26580cf3a0096446ee9a6d742ca9554c21

export default function Layout({ title, subtitle, children, actions }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => { 
    setMobileNavOpen(false); 
  }, [location.pathname]);

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
          <div className="topbar-left">
            <button
              className="menu-toggle-btn"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? "✕" : "☰"}
            </button>
            <div className="topbar-title">
              <div className="topbar-page">{title}</div>
              {subtitle && <div className="topbar-sub">{subtitle}</div>}
            </div>
          </div>

          <div className="topbar-actions">
            <div className="topbar-search">
              <span className="topbar-search-icon">🔍</span>
              <input 
                type="text" 
                className="topbar-search-input" 
                placeholder="Search resources..." 
                aria-label="Search resources"
              />
            </div>

            {isAdmin ? (
              <NotificationBell />
            ) : (
              <button className="topbar-btn" title="Notifications">
                <span style={{ fontSize: 18 }}>🔔</span>
              </button>
            )}
            
            <button className="topbar-btn" title="Help">
              <span style={{ fontSize: 18 }}>❓</span>
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
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
              {actions}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}