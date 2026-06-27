import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../components/Layout";
import { StatusPieChart, AssetTypeBarChart } from "../components/DashboardChart";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const API = "https://haodaasset-backend-1.onrender.com";

function KpiCard({ icon, label, value, sub, color, bg, topColor, onClick, badge }) {
  return (
    <div
      className={`kpi-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      style={{ borderTop: `3px solid ${topColor || color}` }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="kpi-icon-wrapper" style={{ background: bg }}>
          {icon}
        </div>
        {badge && (
          <span className="kpi-badge" style={{ background: bg, color: color }}>
            {badge}
          </span>
        )}
      </div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({ totalAssets:null,availableAssets:null,assignedAssets:null,totalEmployees:null });
  const [pendingRequests, setPendingRequests] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const now = new Date();
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
      setPendingRequests((reqRes.data||[]).filter((r) => r.status === "PENDING").length);
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
    { name: "Assigned",  value: dashboard.assignedAssets || 0 },
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
      if (a.assignedDate) events.push({ id: `assign-${a.assetId}`, icon: "💻", iconBg: "#deebff", action: "Asset Assigned", detail: `${a.laptopName || a.assetType} assigned to ${a.employeeName || "an employee"}`, date: a.assignedDate });
      if (a.returnedStatus === "Yes" && a.returnDate) events.push({ id: `return-${a.assetId}`, icon: "↩️", iconBg: "#e3fcef", action: "Asset Returned", detail: `${a.laptopName || a.assetType} returned`, date: a.returnDate });
    });
    return events.filter((e) => e.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  }, [assets]);

  const utilizationRate = dashboard.totalAssets ? Math.round((dashboard.assignedAssets / dashboard.totalAssets) * 100) : 0;

  const V = (v) => loading ? "—" : (v ?? 0);

  return (
    <Layout title="Dashboard" subtitle="Live overview of your IT inventory">
      {error && (
        <div className="card" style={{ marginBottom: 24, borderColor: "#ffbdad", background: "#ffebe6", padding: "16px 20px", color: "#bf2600", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{error}</span>
        </div>
      )}

      <div className="welcome-banner" style={{ marginBottom: 24 }}>
        <div>
          <div className="welcome-banner-greeting">{greeting},</div>
          <div className="welcome-banner-title">{user?.name || "Administrator"} 👋</div>
          <div className="welcome-banner-sub">
            {loading ? "Loading inventory…" : `${dashboard.availableAssets ?? 0} assets ready to assign · ${pendingRequests ?? 0} pending requests`}
          </div>
        </div>
        <div className="welcome-banner-icon">🖥️</div>
      </div>

      <div className="kpi-row kpi-row-6" style={{ marginBottom: 24 }}>
        <KpiCard icon="📦" label="Total Assets" value={V(dashboard.totalAssets)} sub="Across all departments" color="#0052cc" bg="#deebff" topColor="#0052cc" />
        <KpiCard icon="✅" label="Available" value={V(dashboard.availableAssets)} sub="Ready to assign" color="#00875a" bg="#e3fcef" topColor="#00875a" />
        <KpiCard icon="🔗" label="Assigned" value={V(dashboard.assignedAssets)} sub="In active use" color="#5243aa" bg="#eae6ff" topColor="#5243aa" badge={utilizationRate > 0 ? `${utilizationRate}% used` : undefined} />
        <KpiCard icon="🗃️" label="Spare" value={V(derivedCounts.spare)} sub="In reserve" color="#ff991f" bg="#fffae6" topColor="#ff991f" />
        <KpiCard icon="🔧" label="Under Repair" value={V(derivedCounts.underRepair)} sub="At service center" color="#ff5630" bg="#ffebe6" topColor="#ff5630" />
        <KpiCard icon="⚠️" label="Faulty" value={V(derivedCounts.faulty)} sub="Defective hardware" color="#de350b" bg="#ffebe6" topColor="#de350b" />
      </div>

      <div className="kpi-row kpi-row-2" style={{ marginBottom: 24 }}>
        <KpiCard icon="👥" label="Total Employees" value={V(dashboard.totalEmployees)} sub="Active employee directory" color="#00b8d9" bg="#e6fcff" topColor="#00b8d9" />
        <KpiCard icon="📋" label="Pending Requests" value={V(pendingRequests)} sub="Employee requests awaiting review" color="#de350b" bg="#ffebe6" topColor="#de350b" badge={pendingRequests > 0 ? "Action needed" : undefined} onClick={() => navigate("/asset-requests")} />
      </div>

      <div className="grid-2-1" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Assets by Type</div>
              <div className="card-subtitle">Live breakdown of current inventory</div>
            </div>
          </div>
          <div className="card-body"><AssetTypeBarChart data={typeData} /></div>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Status Allocation</div>
              <div className="card-subtitle">Inventory by status</div>
            </div>
          </div>
          <div className="card-body"><StatusPieChart data={pieData} /></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Latest asset events from your org</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/assets")}>View All</button>
          </div>
          <div className="card-body" style={{ padding: "8px 24px" }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center", color: "var(--color-text-muted)" }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>No activity yet</div>
                <div style={{ fontSize: 13 }}>Assign or return an asset to see it appear here.</div>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Quick Actions</div></div>
            <div className="card-body">
              <div className="action-grid">
                {[
                  { label: "Add Asset", icon: "➕", color: "#0052cc", bg: "#deebff", link: "/assets" },
                  { label: "View Assets", icon: "📋", color: "#00875a", bg: "#e3fcef", link: "/assets" },
                  { label: "Employees", icon: "👥", color: "#5243aa", bg: "#eae6ff", link: "/employees" },
                  { label: "Requests", icon: "🔔", color: "#ff991f", bg: "#fffae6", link: "/asset-requests" },
                ].map((q) => (
                  <Link key={q.label} to={q.link} className="quick-action-btn" style={{ background: q.bg, border: `1px solid ${q.color}33` }}>
                    <span style={{ fontSize: 24 }}>{q.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: q.color }}>{q.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Inventory Health</div></div>
            <div className="card-body" style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Utilization", value: utilizationRate, color: "#0052cc" },
                { label: "Availability", value: dashboard.totalAssets ? Math.round((dashboard.availableAssets / dashboard.totalAssets) * 100) : 0, color: "#00875a" },
              ].map((m) => (
                <div key={m.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-main)" }}>{m.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.value}%</span>
                  </div>
                  <div style={{ height: 8, background: "var(--color-bg-app)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: m.color, width: `${m.value}%`, transition: "width 1s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}