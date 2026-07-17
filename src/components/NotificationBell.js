import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import {
  Bell, X, CheckCheck, Trash2, Settings, Clock, AlertTriangle, AlertCircle,
  Info, CheckCircle2, Laptop, ShieldAlert, Receipt, UserPlus,
  ClipboardList, ArrowUpRight, Moon, RotateCcw, Wifi, WifiOff,
} from "lucide-react";
import "./NotificationBell.css";

/* ── Category → icon + module route ─────────────────────────────────── */
const CATEGORY_META = {
  Task:     { icon: ClipboardList, route: "/pulse" },
  Asset:    { icon: Laptop,        route: "/assets" },
  Billing:  { icon: Receipt,       route: "/service-billing" },
  Security: { icon: ShieldAlert,   route: "/network-credentials" },
  System:   { icon: Info,          route: null },
  Request:  { icon: UserPlus,      route: "/asset-requests" },
};

const PRIORITY_META = {
  Critical: { label: "Critical", icon: AlertTriangle, className: "hz-p-critical" },
  High:     { label: "High",     icon: AlertCircle,   className: "hz-p-high" },
  Normal:   { label: "Normal",   icon: Info,           className: "hz-p-normal" },
  Low:      { label: "Low",      icon: CheckCircle2,   className: "hz-p-low" },
};

const TYPE_LABEL = {
  UPCOMING_TASK: "Upcoming Task", DUE_TODAY: "Due Today", OVERDUE_TASK: "Overdue Task",
  HIGH_PRIORITY_TASK: "High Priority", TASK_ASSIGNED: "Task Assigned", TASK_COMPLETED: "Task Completed",
  ASSET_RETURN_REMINDER: "Asset Return", WARRANTY_EXPIRY: "Warranty Expiry", LICENSE_EXPIRY: "License Expiry",
  SERVICE_BILLING_DUE: "Billing Due", NETWORK_CREDENTIAL_ROTATION: "Credential Rotation",
  FIRMWARE_UPDATE_REMINDER: "Firmware Update", SECURITY_ALERT: "Security Alert", BACKUP_REMINDER: "Backup Reminder",
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function timeRemaining(dueDate) {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { text: `Overdue ${Math.abs(days)}d`, tone: "overdue" };
  if (days === 0) return { text: "Due today", tone: "today" };
  if (days === 1) return { text: "Due tomorrow", tone: "soon" };
  return { text: `Due in ${days}d`, tone: days <= 3 ? "soon" : "later" };
}

function dayBucket(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const startOf = (x) => { const c = new Date(x); c.setHours(0, 0, 0, 0); return c.getTime(); };
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return "Earlier";
}

export default function NotificationBell() {
  const ctx = useNotifications();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filter, setFilter] = useState("all"); // all | unread | task | asset | security | billing
  const [ring, setRing] = useState(false);
  const prevPulseCountRef = useRef(0);

  const {
    pulseNotifications = [], pulseUnread = 0, pulseConnected,
    markPulseRead, markAllPulseRead, snoozePulse, completePulse, clearCompletedPulse, completeTask,
    notifications = [], unread = 0,
    systemNotifications = [], systemUnread = 0, markSystemRead, markAllSystemRead,
    totalUnread = 0,
  } = ctx || {};

  // Ring the bell when a brand-new pulse notification streams in.
  useEffect(() => {
    if (pulseNotifications.length > prevPulseCountRef.current && prevPulseCountRef.current !== 0) {
      setRing(true);
      const t = setTimeout(() => setRing(false), 900);
      return () => clearTimeout(t);
    }
    prevPulseCountRef.current = pulseNotifications.length;
  }, [pulseNotifications.length]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Normalize every source into one shape the drawer can render uniformly.
  const merged = useMemo(() => {
    const fromPulse = pulseNotifications
      .filter((n) => n.status !== "Dismissed")
      .map((n) => ({
        uid: `pulse-${n.notificationId}`,
        source: "pulse",
        raw: n,
        title: n.title,
        description: n.description,
        category: n.category || "System",
        notificationType: n.notificationType,
        priority: n.priority || "Normal",
        relatedModule: n.relatedModule,
        relatedRecordId: n.relatedRecordId,
        dueDate: n.dueDate,
        createdAt: n.createdAt,
        read: n.isRead ?? n.read,
        status: n.status,
      }));

    const fromSystem = systemNotifications.map((n) => ({
      uid: `system-${n.id}`,
      source: "system",
      raw: n,
      title: n.title,
      description: n.message,
      category: "System",
      notificationType: n.type || "SYSTEM",
      priority: n.severity === "critical" ? "Critical" : n.severity === "warning" ? "High" : "Normal",
      relatedModule: null,
      relatedRecordId: null,
      dueDate: null,
      createdAt: n.createdAt,
      read: n.read,
      status: n.read ? "Actioned" : "Pending",
    }));

    const fromRequests = notifications.map((n) => ({
      uid: `request-${n.id}`,
      source: "request",
      raw: n,
      title: "New asset request",
      description: `${n.employeeName || n.employeeId} requested ${n.assetType || "an asset"}`,
      category: "Request",
      notificationType: "ASSET_REQUEST",
      priority: n.urgency === "Critical" ? "Critical" : n.urgency === "Urgent" ? "High" : "Normal",
      relatedModule: "ASSET_REQUEST",
      relatedRecordId: n.id,
      dueDate: null,
      createdAt: n.requestedAt,
      read: n.read,
      status: n.read ? "Actioned" : "Pending",
    }));

    return [...fromPulse, ...fromSystem, ...fromRequests]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [pulseNotifications, systemNotifications, notifications]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "unread":   return merged.filter((n) => !n.read);
      case "task":     return merged.filter((n) => n.category === "Task");
      case "asset":    return merged.filter((n) => n.category === "Asset");
      case "security": return merged.filter((n) => n.category === "Security");
      case "billing":  return merged.filter((n) => n.category === "Billing");
      default:         return merged;
    }
  }, [merged, filter]);

  const grouped = useMemo(() => {
    const groups = { Today: [], Yesterday: [], Earlier: [] };
    filtered.forEach((n) => groups[dayBucket(n.createdAt)].push(n));
    return groups;
  }, [filtered]);

  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  const handleMarkRead = (item) => {
    if (item.source === "pulse") markPulseRead?.(item.raw.notificationId);
    else if (item.source === "system") markSystemRead?.(item.raw.id);
    // asset-request read state is local-only (handled by ctx.toggleOpen elsewhere)
  };

  const handleMarkAllRead = () => {
    markAllPulseRead?.();
    markAllSystemRead?.();
  };

  const handleView = (item) => {
    const meta = CATEGORY_META[item.category];
    if (item.category === "Task" && item.relatedRecordId) {
      navigate(`/pulse?task=${item.relatedRecordId}`);
    } else if (meta?.route) {
      navigate(meta.route);
    }
    closeDrawer();
  };

  const handleComplete = (item) => {
    if (item.category === "Task" && item.relatedRecordId) completeTask?.(item.relatedRecordId);
    else completePulse?.(item.raw.notificationId);
  };

  const totalCount = totalUnread;
  const badgeText = totalCount > 99 ? "99+" : String(totalCount);

  if (!ctx) return null;

  return (
    <div className="hz-notif-root" ref={rootRef}>
      <button
        className={`hz-bell-btn ${ring ? "hz-bell-ring" : ""}`}
        onClick={openDrawer}
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
      >
        <Bell size={19} strokeWidth={2} />
        {totalCount > 0 && <span className="hz-bell-badge">{badgeText}</span>}
      </button>

      {drawerOpen && (
        <>
          <div className="hz-drawer-overlay" onClick={closeDrawer} />
          <aside className="hz-drawer" role="dialog" aria-label="Notification Center">
            <header className="hz-drawer-header">
              <div className="hz-drawer-heading">
                <div className="hz-drawer-title-row">
                  <h2>Notification Center</h2>
                  <span className={`hz-live-dot ${pulseConnected ? "hz-live-on" : "hz-live-off"}`} title={pulseConnected ? "Live" : "Polling"}>
                    {pulseConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                    {pulseConnected ? "Live" : "Polling"}
                  </span>
                </div>
                <p className="hz-drawer-subtitle">
                  {totalCount === 0 ? "You're all caught up" : `${totalCount} unread across ${merged.length} notifications`}
                </p>
              </div>
              <button className="hz-icon-btn" onClick={closeDrawer} aria-label="Close">
                <X size={18} />
              </button>
            </header>

            <div className="hz-drawer-toolbar">
              <div className="hz-filter-pills">
                {[
                  ["all", "All"], ["unread", "Unread"], ["task", "Tasks"],
                  ["asset", "Assets"], ["security", "Security"], ["billing", "Billing"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={`hz-pill ${filter === key ? "hz-pill-active" : ""}`}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="hz-toolbar-actions">
                <button className="hz-text-btn" onClick={handleMarkAllRead} title="Mark all as read">
                  <CheckCheck size={14} /> Mark all read
                </button>
                <button className="hz-text-btn" onClick={clearCompletedPulse} title="Clear completed notifications">
                  <Trash2 size={14} /> Clear completed
                </button>
                <button className="hz-icon-btn hz-icon-btn-sm" onClick={() => { navigate("/settings"); closeDrawer(); }} title="Notification settings">
                  <Settings size={15} />
                </button>
              </div>
            </div>

            <div className="hz-drawer-body">
              {filtered.length === 0 ? (
                <div className="hz-empty-state">
                  <div className="hz-empty-icon"><Bell size={26} /></div>
                  <p>No notifications here.</p>
                  <span>New reminders will appear the moment they're triggered.</span>
                </div>
              ) : (
                ["Today", "Yesterday", "Earlier"].map((bucket) =>
                  grouped[bucket].length === 0 ? null : (
                    <section className="hz-group" key={bucket}>
                      <h3 className="hz-group-label">{bucket}</h3>
                      <div className="hz-card-list">
                        {grouped[bucket].map((item) => (
                          <NotificationCard
                            key={item.uid}
                            item={item}
                            onView={() => handleView(item)}
                            onComplete={() => handleComplete(item)}
                            onSnooze={() => item.source === "pulse" && snoozePulse(item.raw.notificationId, 60)}
                            onMarkRead={() => handleMarkRead(item)}
                          />
                        ))}
                      </div>
                    </section>
                  )
                )
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function NotificationCard({ item, onView, onComplete, onSnooze, onMarkRead }) {
  const catMeta = CATEGORY_META[item.category] || CATEGORY_META.System;
  const CatIcon = catMeta.icon;
  const prio = PRIORITY_META[item.priority] || PRIORITY_META.Normal;
  const PrioIcon = prio.icon;
  const remaining = timeRemaining(item.dueDate);
  const isTask = item.category === "Task";
  const isActionable = item.source === "pulse" && item.status !== "Actioned" && item.status !== "Snoozed";

  return (
    <article className={`hz-card ${!item.read ? "hz-card-unread" : ""}`}>
      <div className={`hz-card-rail ${prio.className}`} />
      <div className="hz-card-main">
        <div className="hz-card-top">
          <span className={`hz-cat-icon ${prio.className}`}><CatIcon size={14} /></span>
          <div className="hz-card-title-block">
            <div className="hz-card-title-row">
              <h4 className="hz-card-title">{item.title}</h4>
              {!item.read && <span className="hz-unread-dot" aria-label="Unread" />}
            </div>
            <div className="hz-card-meta-row">
              <span className={`hz-prio-chip ${prio.className}`}><PrioIcon size={11} /> {prio.label}</span>
              <span className="hz-type-chip">{TYPE_LABEL[item.notificationType] || item.category}</span>
              {item.status === "Snoozed" && <span className="hz-type-chip hz-snoozed"><Moon size={11} /> Snoozed</span>}
            </div>
          </div>
          <span className="hz-time-ago">{timeAgo(item.createdAt)}</span>
        </div>

        {item.description && <p className="hz-card-desc">{item.description}</p>}

        <div className="hz-card-footer">
          <div className="hz-card-tags">
            {item.dueDate && (
              <span className="hz-tag">
                <Clock size={11} /> {item.dueDate}
              </span>
            )}
            {remaining && (
              <span className={`hz-tag hz-remaining-${remaining.tone}`}>{remaining.text}</span>
            )}
            {item.relatedModule && (
              <span className="hz-tag hz-tag-module">{item.relatedModule.replace(/_/g, " ")}</span>
            )}
          </div>

          <div className="hz-card-actions">
            {(isTask || catMeta.route) && (
              <button className="hz-action-btn" onClick={onView}>
                <ArrowUpRight size={13} /> {isTask ? "View Task" : "View"}
              </button>
            )}
            {isActionable && (
              <button className="hz-action-btn" onClick={onComplete}>
                <CheckCircle2 size={13} /> Mark Complete
              </button>
            )}
            {isActionable && (
              <button className="hz-action-btn" onClick={onSnooze}>
                <RotateCcw size={13} /> Snooze
              </button>
            )}
            {!item.read && (
              <button className="hz-action-btn hz-action-btn-quiet" onClick={onMarkRead}>
                <CheckCheck size={13} /> Mark as Read
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
