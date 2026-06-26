import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { StatusPieChart, AssetTypeBarChart } from "../components/DashboardChart";
import { useAuth } from "../context/AuthContext";

const API = "http://localhost:8080";

/* ── KPI Card ─────────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, color, bg, onClick, badge }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "1px solid var(--gray-100)",
        borderTop: `2.5px solid ${color}`,
        padding: "18px 20px",
        boxShadow: "var(--shadow-card)",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.16s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow-card)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: bg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>
          {icon}
        </div>
        {badge && (
          <span style={{
            padding: "2px 8px", borderRadius: 20,
            background: bg, color: color,
            fontSize: 10.5, fontWeight: 700,
            border: `1px solid ${color}20`,
          }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 28, fontWeight: 800, color: color,
        lineHeight: 1, letterSpacing: "-1px",
        fontFamily: "var(--font-data)", marginBottom: 5,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--gray-700)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: "var(--gray-400)" }}>{sub}</div>
    </div>
  );
}

/* ── Progress Bar ─────────────────────────────────────────────────── */
function ProgressBar({ label, value, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-600)" }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color, fontFamily: "var(--font-data)" }}>{value}%</span>
      </div>
      <div style={{ height: 5, background: "var(--gray-100)", borderRadius: 10, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 10,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          width: `${value}%`,
          transition: "width 1.2s cubic-bezier(0.22,1,0.36,1)",
        }} />
      </div>
    </div>
  );
}

/* ── Quick Action Tile ────────────────────────────────────────────── */
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
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color, textAlign: "center" }}>{label}</span>
    </Link>
  );
}

/* ── Main Dashboard ───────────────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [dashboard, setDashboard]       = useState({ totalAssets: null, availableAssets: null, assignedAssets: null, totalEmployees: null });
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
    .catch(() => setError("Couldn't reach the API. Is the Spring Boot server running on :8080?"))
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
      if (a.assignedDate) events.push({ id: `assign-${a.assetId}`, icon: "💻", iconBg: "#eff6ff", action: "Asset Assigned", detail: `${a.laptopName || a.assetType} → ${a.employeeName || "employee"}`, date: a.assignedDate });
      if (a.returnedStatus === "Yes" && a.returnDate) events.push({ id: `return-${a.assetId}`, icon: "↩️", iconBg: "#f0fdf4", action: "Asset Returned", detail: `${a.laptopName || a.assetType} returned`, date: a.returnDate });
    });
    return events.filter((e) => e.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  }, [assets]);

  const utilizationRate  = dashboard.totalAssets ? Math.round((dashboard.assignedAssets / dashboard.totalAssets) * 100) : 0;
  const availabilityRate = dashboard.totalAssets ? Math.round((dashboard.availableAssets / dashboard.totalAssets) * 100) : 0;

  const V = (v) => loading ? "—" : (v ?? 0);

  return (
    <Layout title="Dashboard" subtitle="Live overview of your IT inventory">

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 18, borderRadius: 10, padding: "11px 16px",
          background: "#fef2f2", border: "1px solid #fecaca",
          fontSize: 12.5, color: "#991b1b", display: "flex", gap: 8, alignItems: "center",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </div>
      )}

      {/* Welcome banner */}
      <div className="welcome-banner" style={{ marginBottom: 20 }}>
        <div className="welcome-banner-text">
          <div className="welcome-banner-greeting">{greeting},</div>
          <div className="welcome-banner-title">{user?.name || "Administrator"} 👋</div>
          <div className="welcome-banner-sub">
            {loading
              ? "Loading inventory…"
              : `${dashboard.availableAssets ?? 0} assets ready to assign · ${pendingRequests ?? 0} pending requests`
            }
          </div>
        </div>
        <div className="welcome-banner-icon">🖥️</div>
      </div>

      {/* 6-KPI Row */}
      <div className="kpi-row kpi-row-6" style={{ marginBottom: 20 }}>
        <KpiCard icon="📦" label="Total Assets"  value={V(dashboard.totalAssets)}      sub="All departments"           color="#2563eb" bg="#eff6ff" />
        <KpiCard icon="✅" label="Available"     value={V(dashboard.availableAssets)}   sub="Ready to assign"           color="#16a34a" bg="#f0fdf4" />
        <KpiCard icon="🔗" label="Assigned"      value={V(dashboard.assignedAssets)}    sub="Active use"                color="#1d4ed8" bg="#dbeafe"
          badge={utilizationRate > 0 ? `${utilizationRate}%` : undefined} />
        <KpiCard icon="🗃️" label="Spare"         value={V(derivedCounts.spare)}         sub="In reserve"                color="#a16207" bg="#fef9c3" />
        <KpiCard icon="🔧" label="Under Repair"  value={V(derivedCounts.underRepair)}   sub="Sent for service"          color="#c2410c" bg="#ffedd5" />
        <KpiCard icon="⚠️" label="Faulty"        value={V(derivedCounts.faulty)}        sub="Flagged defective"         color="#b91c1c" bg="#fee2e2" />
      </div>

      {/* 2-KPI row */}
      <div className="kpi-row kpi-row-2" style={{ marginBottom: 20 }}>
        <KpiCard icon="👥" label="Total Employees" value={V(dashboard.totalEmployees)} sub="Active directory"           color="#7c3aed" bg="#f5f3ff" />
        <KpiCard icon="📋" label="Pending Requests" value={V(pendingRequests)}         sub="Awaiting review"            color="#dc2626" bg="#fef2f2"
          badge={pendingRequests > 0 ? "Action needed" : undefined}
          onClick={() => navigate("/asset-requests")} />
      </div>

      {/* Charts row */}
      <div className="grid-2-1" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Assets by Type</div>
              <div className="card-subtitle">Live inventory breakdown</div>
            </div>
          </div>
          <div className="card-body">
            <AssetTypeBarChart data={typeData} />
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Status Allocation</div>
              <div className="card-subtitle">Distribution by status</div>
            </div>
          </div>
          <div className="card-body">
            <StatusPieChart data={pieData} />
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid-2">
        {/* Recent Activity */}
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
                <div className="empty-sub">Assign or return an asset to see events here.</div>
              </div>
            ) : (
              recentActivity.map((item) => (
                <div key={item.id} className="activity-item">
                  <div className="activity-icon" style={{ background: item.iconBg }}>{item.icon}</div>
                  <div className="activity-text">
                    <div className="activity-main"><strong>{item.action}</strong> — {item.detail}</div>
                    <div className="activity-meta">{item.date}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Quick Actions</div>
            </div>
            <div className="card-body">
              <div className="action-grid">
                <QuickAction label="Add Asset"   icon="➕" color="#2563eb" bg="#eff6ff" link="/assets" />
                <QuickAction label="View Assets" icon="📋" color="#16a34a" bg="#f0fdf4" link="/assets" />
                <QuickAction label="Employees"   icon="👥" color="#7c3aed" bg="#f5f3ff" link="/employees" />
                <QuickAction label="Requests"    icon="🔔" color="#d97706" bg="#fffbeb" link="/asset-requests" />
              </div>
            </div>
          </div>

          {/* Inventory Health */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Inventory Health</div>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <ProgressBar label="Utilization"  value={utilizationRate}  color="#2563eb" />
              <ProgressBar label="Availability" value={availabilityRate} color="#16a34a" />
              {dashboard.totalAssets > 0 && (
                <div style={{
                  marginTop: 4, padding: "10px 14px",
                  background: "var(--gray-50)", borderRadius: 8,
                  fontSize: 12, color: "var(--gray-500)",
                  display: "flex", justifyContent: "space-between",
                }}>
                  <span>Health score</span>
                  <span style={{
                    fontWeight: 700,
                    color: availabilityRate > 40 ? "#16a34a" : availabilityRate > 20 ? "#d97706" : "#dc2626",
                  }}>
                    {availabilityRate > 40 ? "Good" : availabilityRate > 20 ? "Fair" : "Low"}
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
