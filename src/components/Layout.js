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
  const colors = ["#2563eb", "#16a34a", "#7c3aed", "#b45309", "#be185d"];
  return colors[(name || "A").charCodeAt(0) % colors.length];
}

/* ── SVG Icons ──────────────────────────────────────────────────── */
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const HelpIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const BellIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const MenuIcon  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const CloseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

/* ── Help Popover ─────────────────────────────────────────────── */
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
        <li><strong>Requests:</strong> employees raise requests; admins approve from Asset Requests.</li>
        <li><strong>Password reset:</strong> admins can reset via the Employees page.</li>
      </ul>
      <div className="help-popover-footer">
        Still stuck? Reach out to your IT administrator directly.
      </div>
    </div>
  );
}

/* ── Employee Notification ─────────────────────────────────────── */
function EmployeeNotificationButton() {
  const navigate = useNavigate();
  const { data } = useGet("/dashboard");
  const pending  = data?.pendingRequests ?? 0;

  return (
    <button
      className="topbar-btn"
      title={pending > 0 ? `${pending} pending request${pending !== 1 ? "s" : ""}` : "No pending requests"}
      aria-label={pending > 0 ? `${pending} pending requests` : "Notifications"}
      onClick={() => navigate("/emp/request")}
      style={{ position: "relative" }}
    >
      <BellIcon />
      {pending > 0 && <span className="notif-badge-icon">{pending > 9 ? "9+" : pending}</span>}
    </button>
  );
}

/* ── Layout ───────────────────────────────────────────────────── */
export default function Layout({ title, subtitle, children, actions }) {
  const { user } = useAuth();
  const isAdmin  = user?.role === "admin";
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchText, setSearchText]       = useState("");
  const [helpOpen, setHelpOpen]           = useState(false);

  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" :
    now.getHours() < 17 ? "Good afternoon" : "Good evening";

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchText.trim();
    if (!q) return;
    navigate(`${isAdmin ? "/assets" : "/emp/assets"}?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="app-main">
        <header className="topbar">
          {/* Mobile toggle */}
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
            {/* Search */}
            <form
              onSubmit={handleSearchSubmit}
              style={{ position: "relative", display: "flex", alignItems: "center" }}
              className="topbar-search"
            >
              <span style={{ position: "absolute", left: 10, color: "var(--gray-400)", pointerEvents: "none", display: "flex" }}>
                <SearchIcon />
              </span>
              <input
                type="text"
                className="topbar-search-input"
                placeholder={isAdmin ? "Search assets…" : "Search my assets…"}
                aria-label="Search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  height: 32, paddingLeft: 32, paddingRight: 10,
                  border: "1.5px solid var(--gray-200)", borderRadius: 8,
                  background: "var(--gray-50)", fontSize: 13,
                  color: "var(--gray-800)", outline: "none",
                  width: 200, transition: "all 0.15s",
                  fontFamily: "var(--font)",
                }}
                onFocus={(e) => { e.target.style.width = "240px"; e.target.style.borderColor = "var(--primary-500)"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.09)"; }}
                onBlur={(e) => { e.target.style.width = "200px"; e.target.style.borderColor = "var(--gray-200)"; e.target.style.background = "var(--gray-50)"; e.target.style.boxShadow = "none"; }}
              />
            </form>

            {/* Notifications */}
            {isAdmin ? <NotificationBell /> : <EmployeeNotificationButton />}

            {/* Help */}
            <div style={{ position: "relative" }}>
              <button
                className="topbar-btn"
                title="Help"
                aria-label="Help"
                aria-expanded={helpOpen}
                onClick={() => setHelpOpen((v) => !v)}
              >
                <HelpIcon />
              </button>
              {helpOpen && <HelpPopover onClose={() => setHelpOpen(false)} />}
            </div>

            {/* Avatar */}
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
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
              {actions}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
