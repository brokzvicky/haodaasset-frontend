import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  Boxes, CheckCircle2, Link2, Archive, Wrench, AlertTriangle,
  Users, FileText, Plus, Bell, Monitor, ArrowUpRight, RotateCcw,
} from "lucide-react";
import Layout from "../components/Layout";
import { StatusPieChart, AssetTypeBarChart } from "../components/DashboardChart";
import { useAuth } from "../context/AuthContext";
import useCountUp from "../hooks/useCountUp";
import "./Dashboard.css";

const API = "https://haodaasset-backend-1.onrender.com";

function KpiCard({ icon, label, value, sub, gradA, gradB, glow, onClick, badge }) {
  const count = useCountUp(value, 900);
  return (
    <div
      className={`kpi-card ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      style={{
        "--kpi-a": gradA, "--kpi-b": gradB, "--kpi-glow": glow,
        backgroundImage: `linear-gradient(146deg, ${gradA} 0%, ${gradB} 100%)`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="kpi-icon-wrapper">{icon}</div>
        {badge && <span className="kpi-badge">{badge}</span>}
      </div>
      <div className="kpi-value">{count}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-sub">{sub}</div>
    </div>
  );
}

function ProgressBar({ label, value, color }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-600)" }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color, fontFamily: "var(--font-data)" }}>{value}%</span>
      </div>
      <div style={{ height: 7, background: "var(--gray-100)", borderRadius: 10, overflow: "hidden" }}>
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

function QuickAction({ label, icon, color, bg, link }) {
  return (
    <Link
      to={link}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 9, padding: "18px 10px", borderRadius: 12,
        background: bg, border: `1.5px solid ${color}18`,
        cursor: "pointer", textDecoration: "none",
        transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 10px 22px ${color}22`;
        e.currentTarget.style.borderColor = `${color}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = `${color}18`;
      }}
    >
      <span style={{
        color, width: 36, height: 36, borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "#fff",
      }}>
        {icon}
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 700, color, textAlign: "center" }}>{label}</span>
    </Link>
  );
}

function activityIcon(type) {
  if (type === "assign") return { bg: "#eff6ff", color: "#2563eb", el: <Monitor size={15} /> };
  return { bg: "#f0fdf4", color: "#16a34a", el: <RotateCcw size={15} /> };
}

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

  const V = (v) => loading ? 0 : (v ?? 0);

  return (
    <Layout title="Dashboard" subtitle="Live overview of your IT inventory">

      {error && (
        <div style={{
          marginBottom: 18, borderRadius: 10, padding: "11px 16px",
          background: "var(--danger-bg)", border: "1px solid var(--danger-border)",
          fontSize: 12.5, color: "var(--danger)",
          display: "flex", gap: 8, alignItems: "center",
        }}>
          <AlertTriangle size={16} />{error}
        </div>
      )}

      <div className="welcome-banner">
        <div className="welcome-banner-text">
          <div className="welcome-banner-greeting">{greeting},</div>
          <div className="welcome-banner-title">{user?.name || "Administrator"} 👋</div>
          <div className="welcome-banner-sub">
            {loading
              ? "Loading inventory…"
              : `${dashboard.availableAssets ?? 0} assets ready to assign · ${pendingRequests ?? 0} pending requests`}
          </div>
        </div>
        <div className="welcome-banner-icon"><Monitor size={34} /></div>
      </div>

      <div className="kpi-row kpi-row-6" style={{ marginBottom: 16 }}>
        <KpiCard icon={<Boxes size={19} />}         label="Total Assets"   value={V(dashboard.totalAssets)}     sub="All departments"
          gradA="#1e3a8a" gradB="#2563eb" glow="rgba(37,99,235,0.45)" />
        <KpiCard icon={<CheckCircle2 size={19} />}  label="Available"      value={V(dashboard.availableAssets)} sub="Ready to assign"
          gradA="#065f46" gradB="#10b981" glow="rgba(16,185,129,0.4)" />
        <KpiCard icon={<Link2 size={19} />}         label="Assigned"       value={V(dashboard.assignedAssets)}  sub="In active use"
          gradA="#3730a3" gradB="#6366f1" glow="rgba(99,102,241,0.4)"
          badge={utilizationRate > 0 ? `${utilizationRate}%` : undefined} />
        <KpiCard icon={<Archive size={19} />}       label="Spare"          value={V(derivedCounts.spare)}       sub="In reserve"
          gradA="#92400e" gradB="#d97706" glow="rgba(217,119,6,0.4)" />
        <KpiCard icon={<Wrench size={19} />}        label="Under Repair"   value={V(derivedCounts.underRepair)} sub="At service"
          gradA="#9a3412" gradB="#ea580c" glow="rgba(234,88,12,0.4)" />
        <KpiCard icon={<AlertTriangle size={19} />} label="Faulty"         value={V(derivedCounts.faulty)}      sub="Defective"
          gradA="#991b1b" gradB="#ef4444" glow="rgba(239,68,68,0.4)" />
      </div>

      <div className="kpi-row kpi-row-2" style={{ marginBottom: 20 }}>
        <KpiCard icon={<Users size={19} />}    label="Total Employees"  value={V(dashboard.totalEmployees)} sub="Active directory"
          gradA="#581c87" gradB="#9333ea" glow="rgba(147,51,234,0.4)" />
        <KpiCard icon={<FileText size={19} />} label="Pending Requests" value={V(pendingRequests)}          sub="Awaiting your review"
          gradA="#9d174d" gradB="#ec4899" glow="rgba(236,72,153,0.4)"
          badge={pendingRequests > 0 ? "Action needed" : undefined}
          onClick={() => navigate("/asset-requests")} />
      </div>

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

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Activity</div>
              <div className="card-subtitle">Latest asset events</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/assets")}>
              View All <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="card-body" style={{ padding: "6px 20px" }}>
            {recentActivity.length === 0 ? (
              <div className="empty-state" style={{ padding: "28px 0" }}>
                <div className="empty-title">No activity yet</div>
                <div className="empty-sub">Assign or return assets to see events here.</div>
              </div>
            ) : (
              recentActivity.map((item) => {
                const { bg, color, el } = activityIcon(item.type);
                return (
                  <div key={item.id} className="activity-item">
                    <div className="activity-icon" style={{ background: bg, color }}>{el}</div>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Quick Actions</div></div>
            <div className="card-body">
              <div className="action-grid">
                <QuickAction label="Add Asset"   icon={<Plus size={17} />}    color="#2563eb" bg="#eff6ff" link="/assets" />
                <QuickAction label="View Assets" icon={<Monitor size={17} />} color="#16a34a" bg="#f0fdf4" link="/assets" />
                <QuickAction label="Employees"   icon={<Users size={17} />}   color="#7c3aed" bg="#f5f3ff" link="/employees" />
                <QuickAction label="Requests"    icon={<Bell size={17} />}    color="#d97706" bg="#fffbeb" link="/asset-requests" />
              </div>
            </div>
          </div>

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
