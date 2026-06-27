import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import "./NotificationBell.css";

const URGENCY_COLOR = { Critical: "#de350b", Urgent: "#ff991f", Normal: "#00875a" };
const URGENCY_BG    = { Critical: "#ffebe6", Urgent: "#fffae6", Normal: "#e3fcef" };

function timeAgo(dateStr) {
  if(!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotifItem({ n, onClick }) {
  return (
    <div className={`notif-item ${!n.read ? "unread" : ""}`} onClick={onClick}>
      {!n.read && <div className="notif-indicator" />}
      
      <div 
        className="notif-icon"
        style={{
          background: URGENCY_BG[n.urgency] || "#deebff",
          border: `1px solid ${URGENCY_COLOR[n.urgency] || "#0052cc"}33`
        }}
      >
        📋
      </div>

      <div className="notif-content">
        <div className="notif-content-header">
          <span className="notif-item-title">New Asset Request</span>
          {!n.read && <span className="notif-dot" />}
          <span 
            className="notif-urgency"
            style={{
              color: URGENCY_COLOR[n.urgency] || "#6b778c",
              background: URGENCY_BG[n.urgency] || "#ebecf0"
            }}
          >
            {n.urgency}
          </span>
        </div>
        <div className="notif-desc">
          <span className="notif-desc-bold">{n.employeeName}</span> ({n.employeeId})
          {" · "}<span className="notif-desc-bold">{n.assetType}</span>
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
    function handler(e) { if(ref.current && !ref.current.contains(e.target)) close(); }
    function handleKey(e) { if(e.key === "Escape") close(); }
    if(open) {
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
        🔔
        {unread > 0 && (
          <span className="notif-badge-icon">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-header">
            <div>
              <div className="notif-title">
                Notifications
                {unread > 0 && (
                  <span className="notif-count-badge">{unread} new</span>
                )}
              </div>
              <div className="notif-subtitle">
                {notifications.length} pending request{notifications.length !== 1 ? "s" : ""}
              </div>
            </div>
            <button onClick={goToRequests} className="notif-view-all">
              View all →
            </button>
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-main)", marginBottom: 4 }}>All caught up!</div>
                <div style={{ fontSize: 13 }}>No pending requests to review.</div>
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