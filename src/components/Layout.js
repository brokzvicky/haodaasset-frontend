import React, { useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useGet } from "../hooks/useEmployeeApi";
import "./Layout.css";

function initials(name) {
  return (name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function avatarBg(name) {
  const colors = ["#0052cc", "#00875a", "#5243aa", "#ff5630", "#00b8d9"];
  return colors[(name || "A").charCodeAt(0) % colors.length];
}

// Lightweight, dependency-free popover used by the Help button. Real,
// useful content (no placeholder/dummy copy) rather than a dead button.
function HelpPopover({ onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    function handleKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="help-popover" role="dialog" aria-label="Help">
      <div className="help-popover-title">Need a hand?</div>
      <ul className="help-popover-list">
        <li><strong>Assets:</strong> add, assign, return, or retire devices from the Assets page.</li>
        <li><strong>Requests:</strong> employees raise requests from "Asset Request"; admins approve them from "Asset Requests".</li>
        <li><strong>Password issues:</strong> admins can reset an employee's password back to the org default from the Employees page.</li>
      </ul>
      <div className="help-popover-footer">
        Still stuck? Reach out to your IT administrator directly.
      </div>
    </div>
  );
}

// Employee-side notification affordance. There is no separate
// "notifications" backend feature for employees, so rather than leaving a
// dead, non-interactive bell icon, this surfaces the one piece of real,
// already-available data relevant to "things needing your attention": the
// count of your own pending asset requests.
function EmployeeNotificationButton() {
  const navigate = useNavigate();
  const { data } = useGet("/dashboard");
  const pending = data?.pendingRequests ?? 0;

  return (
    <button
      className="topbar-btn"
      title={pending > 0 ? `${pending} pending request${pending !== 1 ? "s" : ""}` : "No pending requests"}
      aria-label={pending > 0 ? `${pending} pending requests` : "Notifications"}
      onClick={() => navigate("/emp/request")}
    >
      <span style={{ fontSize: 18 }}>🔔</span>
      {pending > 0 && <span className="notif-badge-icon">{pending > 9 ? "9+" : pending}</span>}
    </button>
  );
}

export default function Layout({ title, subtitle, children, actions }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => { 
    setMobileNavOpen(false); 
  }, [location.pathname]);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" :
    now.getHours() < 17 ? "Good afternoon" : "Good evening";

  // Routes to the most relevant list page with the query applied, rather
  // than pretending to be a global cross-entity search engine.
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchText.trim();
    if (!q) return;
    const target = isAdmin ? "/assets" : "/emp/assets";
    navigate(`${target}?q=${encodeURIComponent(q)}`);
  };

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
            <form className="topbar-search" onSubmit={handleSearchSubmit}>
              <span className="topbar-search-icon">🔍</span>
              <input
                type="text"
                className="topbar-search-input"
                placeholder={isAdmin ? "Search assets…" : "Search my assets…"}
                aria-label={isAdmin ? "Search assets" : "Search my assets"}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </form>

            {isAdmin ? (
              <NotificationBell />
            ) : (
              <EmployeeNotificationButton />
            )}

            <div style={{ position: "relative" }}>
              <button
                className="topbar-btn"
                title="Help"
                aria-label="Help"
                aria-expanded={helpOpen}
                onClick={() => setHelpOpen((v) => !v)}
              >
                <span style={{ fontSize: 18 }}>❓</span>
              </button>
              {helpOpen && <HelpPopover onClose={() => setHelpOpen(false)} />}
            </div>
            
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