import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import "./NotificationBell.css";

const URGENCY_COLOR = { Critical: "#dc2626", Urgent: "#d97706", Normal: "#16a34a" };
const URGENCY_BG    = { Critical: "#fef2f2", Urgent: "#fffbeb", Normal: "#f0fdf4" };

const BellSvg = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const DocSvg = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotifItem({ n, onClick }) {
  const color = URGENCY_COLOR[n.urgency] || "#2563eb";
  const bg    = URGENCY_BG[n.urgency]    || "#eff6ff";

  return (
    <div className={`notif-item ${!n.read ? "unread" : ""}`} onClick={onClick}>
      {!n.read && <div className="notif-indicator" />}

      <div className="notif-icon" style={{ background: bg, border: `1px solid ${color}22` }}>
        <DocSvg />
      </div>

      <div className="notif-content">
        <div className="notif-content-header">
          <span className="notif-item-title">Asset Request</span>
          {!n.read && <span className="notif-dot" />}
          <span className="notif-urgency" style={{ color, background: bg }}>
            {n.urgency}
          </span>
        </div>
        <div className="notif-desc">
          <span className="notif-desc-bold">{n.employeeName}</span>
          {" "}
          <span style={{ color: "var(--gray-400)", fontSize: 11 }}>({n.employeeId})</span>
          {" · "}
          <span className="notif-desc-bold">{n.assetType}</span>
        </div>
        <div className="notif-time">{timeAgo(n.requestedAt)}</div>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const { notifications, unread, open, toggleOpen, close } = useNotifications();
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) close(); }
    function handleKey(e) { if (e.key === "Escape") close(); }
    if (open) {
      document.addEventListener("mousedown", handler);
      document.addEventListener("keydown", handleKey);
    }
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, close]);

  const goToRequests = () => { close(); navigate("/asset-requests"); };

  return (
    <div ref={ref} className="notif-bell-wrapper">
      <button
        className={`topbar-btn notif-btn ${open ? "is-open" : ""}`}
        onClick={toggleOpen}
        title="Notifications"
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <BellSvg />
        {unread > 0 && (
          <span className="notif-badge-icon">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-header">
            <div>
              <div className="notif-title">
                Notifications
                {unread > 0 && <span className="notif-count-badge">{unread} new</span>}
              </div>
              <div className="notif-subtitle">
                {notifications.length} pending request{notifications.length !== 1 ? "s" : ""}
              </div>
            </div>
            <button onClick={goToRequests} className="notif-view-all">View all →</button>
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <div style={{ fontSize: 30, marginBottom: 10 }}>🎉</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--gray-700)", marginBottom: 4 }}>All caught up!</div>
                <div style={{ fontSize: 12.5 }}>No pending requests to review.</div>
              </div>
            ) : (
              notifications.map((n) => (
                <NotifItem key={n.id} n={n} onClick={goToRequests} />
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notif-footer">
              <button onClick={goToRequests} className="notif-footer-btn">
                Open Asset Requests →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
