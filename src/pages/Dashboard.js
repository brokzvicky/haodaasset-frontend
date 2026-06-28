import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { StatusPieChart, AssetTypeBarChart } from "../components/DashboardChart";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const API = "https://haodaasset-backend-1.onrender.com";

/* ── SVG Icons ─────────────────────────────────────────────────── */
const IconBox      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
const IconCheck    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconLink     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const IconArchive  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
const IconWrench   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
const IconAlert    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconUsers    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconDoc      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconPlus     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconBell     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconMonitor  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 20h8M12 18v2"/></svg>;

/* ── KPI Card ──────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, color, bg, topColor, onClick, badge }) {
  return (
    <div
      className={`kpi-card ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      style={{ borderTop: `3px solid ${topColor || color}` }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="kpi-icon-wrapper" style={{ background: bg, color }}>
          {icon}
        </div>
        {badge && (
          <span className="kpi-badge" style={{ background: bg, color }}>{badge}</span>
        )}
      </div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

/* ── Progress Bar ──────────────────────────────────────────────── */
function ProgressBar({ label, value, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-600)" }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color, fontFamily: "var(--font-data)" }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: "var(--gray-100)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 10,
          background: `linear-gradient(90deg, ${color}bb, ${color})`,
          width: `${value}%`,
          transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)",
        }} />
      </div>
    </div>
  );
}

/* ── Quick Action ──────────────────────────────────────────────── */
function QuickAction({ label, icon, color, bg, link }) {
  return (
    <Link
      to={link}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 8, padding: "16px 10px", borderRadius: 10,
        background: bg, border: `1.5px solid ${color}18`,
        cursor: "pointer", textDecoration: "none",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 6px 18px ${color}1a`;
        e.currentTarget.style.borderColor = `${color}35`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = `${color}18`;
      }}
    >
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color, textAlign: "center" }}>{label}</span>
    </Link>
  );
}

/* ── Activity Row Icon ─────────────────────────────────────────── */
function activityIcon(type) {
  if (type === "assign") return { bg: "#eff6ff", el: <IconMonitor /> };
  return { bg: "#f0fdf4", el: <span style={{ fontSize: 14 }}>↩</span> };
}

/* ── Main ──────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [dashboard, setDashboard]       = useState({ totalAssets:null,availableAssets:null,assignedAssets:null,totalEmployees:null });
  const [pendingRequests, setPendingRequests] = useState(null);
  const [assets, setAssets]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  const now      = new Date();
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/assets/dashboard`),
      axios.get(`${API}/assets`),
      axios.get(`${API}/api/admin/requests`),
    ])
    .then(([dashRes, assetsRes, reqRes]) => {
      setDashboard(dashRes.data);
      setAssets(assetsRes.data);
      setPendingRequests((reqRes.data || []).filter((r) => r.status === "PENDING").length);
      setError("");
    })
    .catch(() => setError("Couldn't reach the API. Is the Spring Boot server running?"))
    .finally(() => setLoading(false));
  }, []);

  const derivedCounts = useMemo(() => ({
    spare:       assets.filter((a) => a.assetStatus === "Spare").length,
    underRepair: assets.filter((a) => a.assetStatus === "Under Repair").length,
    faulty:      assets.filter((a) => a.assetStatus === "Faulty").length,
  }), [assets]);

  const pieData = useMemo(() => [
    { name: "Available", value: dashboard.availableAssets || 0 },
    { name: "Assigned",  value: dashboard.assignedAssets  || 0 },
    { name: "Spare",     value: derivedCounts.spare },
    { name: "Repair",    value: derivedCounts.underRepair },
    { name: "Faulty",    value: derivedCounts.faulty },
  ], [dashboard, derivedCounts]);

  const typeData = useMemo(() => {
    const counts = {};
    assets.forEach((a) => { const t = a.assetType || "Other"; counts[t] = (counts[t] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [assets]);

  const recentActivity = useMemo(() => {
    const events = [];
    assets.forEach((a) => {
      if (a.assignedDate) events.push({ id: `assign-${a.assetId}`, type: "assign", action: "Asset Assigned", detail: `${a.laptopName || a.assetType} → ${a.employeeName || "employee"}`, date: a.assignedDate });
      if (a.returnedStatus === "Yes" && a.returnDate) events.push({ id: `return-${a.assetId}`, type: "return", action: "Asset Returned", detail: `${a.laptopName || a.assetType} returned`, date: a.returnDate });
    });
    return events.filter((e) => e.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  }, [assets]);

  const utilizationRate  = dashboard.totalAssets ? Math.round((dashboard.assignedAssets  / dashboard.totalAssets) * 100) : 0;
  const availabilityRate = dashboard.totalAssets ? Math.round((dashboard.availableAssets / dashboard.totalAssets) * 100) : 0;

  const V = (v) => loading ? "—" : (v ?? 0);

  return (
    <Layout title="Dashboard" subtitle="Live overview of your IT inventory">

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 18, borderRadius: 10, padding: "11px 16px",
          background: "var(--danger-bg)", border: "1px solid var(--danger-border)",
          fontSize: 12.5, color: "var(--danger)",
          display: "flex", gap: 8, alignItems: "center",
        }}>
          <IconAlert />{error}
        </div>
      )}

      {/* Welcome */}
      <div className="welcome-banner" style={{ marginBottom: 20 }}>
        <div className="welcome-banner-text">
          <div className="welcome-banner-greeting">{greeting},</div>
          <div className="welcome-banner-title">{user?.name || "Administrator"} 👋</div>
          <div className="welcome-banner-sub">
            {loading
              ? "Loading inventory…"
              : `${dashboard.availableAssets ?? 0} assets ready to assign · ${pendingRequests ?? 0} pending requests`}
          </div>
        </div>
        <div className="welcome-banner-icon">🖥️</div>
      </div>

      {/* 6-KPI Row */}
      <div className="kpi-row kpi-row-6" style={{ marginBottom: 16 }}>
        <KpiCard icon={<IconBox />}     label="Total Assets"   value={V(dashboard.totalAssets)}     sub="All departments"   color="#2563eb" bg="#eff6ff" topColor="#2563eb" />
        <KpiCard icon={<IconCheck />}   label="Available"      value={V(dashboard.availableAssets)} sub="Ready to assign"   color="#16a34a" bg="#f0fdf4" topColor="#16a34a" />
        <KpiCard icon={<IconLink />}    label="Assigned"       value={V(dashboard.assignedAssets)}  sub="In active use"     color="#1d4ed8" bg="#dbeafe" topColor="#1d4ed8"
          badge={utilizationRate > 0 ? `${utilizationRate}%` : undefined} />
        <KpiCard icon={<IconArchive />} label="Spare"          value={V(derivedCounts.spare)}       sub="In reserve"        color="#a16207" bg="#fef9c3" topColor="#ca8a04" />
        <KpiCard icon={<IconWrench />}  label="Under Repair"   value={V(derivedCounts.underRepair)} sub="At service"        color="#c2410c" bg="#ffedd5" topColor="#ea580c" />
        <KpiCard icon={<IconAlert />}   label="Faulty"         value={V(derivedCounts.faulty)}      sub="Defective"         color="#b91c1c" bg="#fee2e2" topColor="#dc2626" />
      </div>

      {/* 2-KPI Row */}
      <div className="kpi-row kpi-row-2" style={{ marginBottom: 20 }}>
        <KpiCard icon={<IconUsers />} label="Total Employees"  value={V(dashboard.totalEmployees)} sub="Active directory"        color="#7c3aed" bg="#f5f3ff" topColor="#7c3aed" />
        <KpiCard icon={<IconDoc />}   label="Pending Requests" value={V(pendingRequests)}          sub="Awaiting your review"    color="#dc2626" bg="#fef2f2" topColor="#dc2626"
          badge={pendingRequests > 0 ? "Action needed" : undefined}
          onClick={() => navigate("/asset-requests")} />
      </div>

      {/* Charts */}
      <div className="grid-2-1" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Assets by Type</div>
              <div className="card-subtitle">Live inventory breakdown</div>
            </div>
          </div>
          <div className="card-body"><AssetTypeBarChart data={typeData} /></div>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Status Distribution</div>
              <div className="card-subtitle">Inventory by current status</div>
            </div>
          </div>
          <div className="card-body"><StatusPieChart data={pieData} /></div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-2">
        {/* Activity */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Latest asset events</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/assets")}>View All</button>
          </div>
          <div className="card-body" style={{ padding: "6px 20px" }}>
            {recentActivity.length === 0 ? (
              <div className="empty-state" style={{ padding: "28px 0" }}>
                <div className="empty-title">No activity yet</div>
                <div className="empty-sub">Assign or return assets to see events here.</div>
              </div>
            ) : (
              recentActivity.map((item) => {
                const { bg, el } = activityIcon(item.type);
                return (
                  <div key={item.id} className="activity-item">
                    <div className="activity-icon" style={{ background: bg, color: item.type === "assign" ? "#2563eb" : "#16a34a" }}>{el}</div>
                    <div className="activity-text">
                      <div className="activity-main"><strong>{item.action}</strong> — {item.detail}</div>
                      <div className="activity-meta">{item.date}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header"><div className="card-title">Quick Actions</div></div>
            <div className="card-body">
              <div className="action-grid">
                <QuickAction label="Add Asset"   icon={<IconPlus />}    color="#2563eb" bg="#eff6ff" link="/assets" />
                <QuickAction label="View Assets" icon={<IconMonitor />} color="#16a34a" bg="#f0fdf4" link="/assets" />
                <QuickAction label="Employees"   icon={<IconUsers />}   color="#7c3aed" bg="#f5f3ff" link="/employees" />
                <QuickAction label="Requests"    icon={<IconBell />}    color="#d97706" bg="#fffbeb" link="/asset-requests" />
              </div>
            </div>
          </div>

          {/* Inventory Health */}
          <div className="card">
            <div className="card-header"><div className="card-title">Inventory Health</div></div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ProgressBar label="Utilization"  value={utilizationRate}  color="#2563eb" />
              <ProgressBar label="Availability" value={availabilityRate} color="#16a34a" />
              {dashboard.totalAssets > 0 && (
                <div style={{ marginTop: 2, padding: "9px 12px", background: "var(--gray-50)", borderRadius: 8, fontSize: 12, color: "var(--gray-500)", display: "flex", justifyContent: "space-between" }}>
                  <span>Fleet health</span>
                  <span style={{ fontWeight: 700, color: availabilityRate > 40 ? "#16a34a" : availabilityRate > 20 ? "#d97706" : "#dc2626" }}>
                    {availabilityRate > 40 ? "Good ✓" : availabilityRate > 20 ? "Fair" : "Low"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
