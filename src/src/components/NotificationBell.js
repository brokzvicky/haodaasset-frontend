import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";

const URGENCY_COLOR = { Critical: "#dc2626", Urgent: "#d97706", Normal: "#16a34a" };
const URGENCY_BG    = { Critical: "#fef2f2", Urgent: "#fffbeb", Normal: "#f0fdf4" };

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const BellIcon = ({ hasUnread }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={hasUnread ? "none" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

function NotifItem({ n, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", gap: 12, padding: "13px 16px",
        borderBottom: "1px solid var(--gray-50)",
        background: n.read ? "#fff" : "#f0f7ff",
        cursor: "pointer", transition: "background 0.12s",
        position: "relative",
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
      onMouseLeave={(e) => e.currentTarget.style.background = n.read ? "#fff" : "#f0f7ff"}
    >
      {/* Unread accent */}
      {!n.read && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0,
          width: 3, borderRadius: "0 2px 2px 0",
          background: "var(--primary)",
        }} />
      )}

      {/* Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: URGENCY_BG[n.urgency] || "#eff6ff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15, border: `1px solid ${URGENCY_COLOR[n.urgency] || "#1a56db"}18`,
        marginLeft: !n.read ? 4 : 0,
      }}>
        📋
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gray-900)" }}>
            Asset Request
          </span>
          {!n.read && (
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--primary)", display: "inline-block", flexShrink: 0 }} />
          )}
          <span style={{
            marginLeft: "auto", fontSize: 10.5,
            color: URGENCY_COLOR[n.urgency] || "var(--gray-500)",
            fontWeight: 700, background: URGENCY_BG[n.urgency] || "var(--primary-50)",
            padding: "1px 6px", borderRadius: 20,
          }}>
            {n.urgency}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: "var(--gray-600)", lineHeight: 1.45 }}>
          <span style={{ fontWeight: 600 }}>{n.employeeName}</span>
          <span style={{ color: "var(--gray-400)" }}> ({n.employeeId})</span>
          {" · "}
          <span style={{ fontWeight: 600, color: "var(--gray-700)" }}>{n.assetType}</span>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--gray-400)", marginTop: 3 }}>
          {timeAgo(n.requestedAt)}
        </div>
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
    <div ref={ref} style={{ position: "relative" }}>
      {/* Bell */}
      <button
        className="topbar-btn"
        onClick={toggleOpen}
        title="Notifications"
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        style={{
          background: open ? "var(--gray-100)" : "#fff",
          border: open ? "1px solid var(--gray-300)" : "1px solid var(--gray-200)",
          position: "relative",
        }}
      >
        <BellIcon hasUnread={unread > 0} />
        {unread > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4,
            minWidth: 16, height: 16,
            background: "#dc2626", color: "#fff",
            borderRadius: 999, fontSize: 9.5, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #fff", padding: "0 3px",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="notif-panel"
          role="dialog"
          aria-label="Notifications"
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 368, background: "#fff",
            border: "1px solid var(--gray-200)",
            borderRadius: 12,
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07), 0 20px 48px -8px rgba(0,0,0,0.14)",
            zIndex: 999, overflow: "hidden",
            animation: "dropIn 0.15s ease",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 16px",
            background: "var(--gray-50)",
            borderBottom: "1px solid var(--gray-100)",
          }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gray-900)", display: "flex", alignItems: "center", gap: 8 }}>
                Notifications
                {unread > 0 && (
                  <span style={{ background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 20 }}>
                    {unread} new
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>
                {notifications.length} pending request{notifications.length !== 1 ? "s" : ""}
              </div>
            </div>
            <button
              onClick={goToRequests}
              style={{
                fontSize: 11.5, fontWeight: 600, color: "var(--primary)",
                background: "var(--primary-50)", border: "none",
                borderRadius: 6, padding: "5px 10px", cursor: "pointer",
              }}
            >
              View all →
            </button>
          </div>

          {/* Items */}
          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "36px 20px", textAlign: "center", color: "var(--gray-400)" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🎉</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-600)", marginBottom: 4 }}>All caught up!</div>
                <div style={{ fontSize: 12 }}>No pending requests to review.</div>
              </div>
            ) : (
              notifications.map((n) => (
                <NotifItem key={n.id} n={n} onClick={goToRequests} />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: "9px 16px",
              borderTop: "1px solid var(--gray-100)",
              background: "var(--gray-50)",
              textAlign: "center",
            }}>
              <button
                onClick={goToRequests}
                style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", background: "none", border: "none", cursor: "pointer" }}
              >
                Open Asset Requests →
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes dropIn { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}

