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