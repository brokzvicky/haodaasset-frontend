import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { AssetTypeBarChart } from "../components/DashboardChart";

const API = "https://haodaasset-backend-1.onrender.com";

export default function Reports() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios.get(`${API}/assets`)
      .then((r) => { setAssets(r.data); setError(""); })
      .catch(() => { setAssets([]); setError("Couldn't load report data. Is the API running?"); })
      .finally(() => setLoading(false));
  }, []);

  const totalAssets    = assets.length;
  const assignedAssets = assets.filter((a) => a.assetStatus === "Assigned").length;
  const availableAssets= assets.filter((a) => a.assetStatus === "Available").length;
  const utilization    = totalAssets ? Math.round((assignedAssets / totalAssets) * 100) : 0;

  // Breakdown by type
  const typeData = useMemo(() => {
    const counts = {};
    assets.forEach((a) => { const t = a.assetType || "Other"; counts[t] = (counts[t] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [assets]);

  // Breakdown by department (derived from employee names for now — ideal: join with employee table)
  const deptData = useMemo(() => {
    const counts = {};
    assets.forEach((a) => {
      const dept = a.employeeRole || "Unassigned";
      if (!counts[dept]) counts[dept] = { dept, total: 0, assigned: 0, available: 0 };
      counts[dept].total++;
      if (a.assetStatus === "Assigned")  counts[dept].assigned++;
      if (a.assetStatus === "Available") counts[dept].available++;
    });
    return Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [assets]);

  const exportCSV = () => {
    if (!assets.length) return;
    const headers = ["Asset ID","Employee","Role","Location","Type","Asset Name","Brand","Model","Serial No","Status","Assigned Date"];
    const rows = assets.map((a) => [
      a.assetId, a.employeeName||"", a.employeeRole||"", a.location||"",
      a.assetType, a.laptopName, a.brand, a.model||"", a.serialNumber,
      a.assetStatus, a.assignedDate||"",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url; a.download = "asset-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout title="Reports" subtitle="Real-time asset analytics from PostgreSQL">
      {error && (
        <div className="card" style={{ marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2", padding: "12px 18px", fontSize: 13, color: "#991b1b" }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI Strip */}
      <div className="kpi-row kpi-row-4" style={{ marginBottom: 24 }}>
        {[
          { label: "Total Assets",  value: loading ? "—" : totalAssets,     color: "#1a56db", bg: "#eff6ff" },
          { label: "Assigned",      value: loading ? "—" : assignedAssets,  color: "#d97706", bg: "#fffbeb" },
          { label: "Available",     value: loading ? "—" : availableAssets, color: "#059669", bg: "#ecfdf5" },
          { label: "Utilization",   value: loading ? "—" : `${utilization}%`,color: "#7c3aed", bg: "#f5f3ff" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "18px 22px", borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--gray-400)", marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color, letterSpacing: "-1px" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Bar Chart by Asset Type */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Assets by Type</div>
            <div className="card-subtitle">Live from asset inventory</div>
          </div>
          <div className="card-body">
            {loading ? (
              <div className="empty-state" style={{ padding: "32px 0" }}><div>⏳</div><div className="empty-title">Loading…</div></div>
            ) : (
              <AssetTypeBarChart data={typeData} />
            )}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">By Role / Team</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loading ? (
              <div className="empty-state" style={{ padding: "32px 0" }}><div>⏳</div><div className="empty-title">Loading…</div></div>
            ) : deptData.length === 0 ? (
              <div className="empty-state" style={{ padding: "32px 0" }}>
                <div className="empty-title">No data yet</div>
                <div className="empty-sub">Add assets to see the breakdown.</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Role / Team</th><th>Total</th><th>Assigned</th><th>Available</th><th>Utilization</th></tr>
                </thead>
                <tbody>
                  {deptData.map((d) => (
                    <tr key={d.dept}>
                      <td style={{ fontWeight: 600 }}>{d.dept}</td>
                      <td>{d.total}</td>
                      <td><span style={{ color: "#d97706", fontWeight: 600 }}>{d.assigned}</span></td>
                      <td><span style={{ color: "#059669", fontWeight: 600 }}>{d.available}</span></td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 5, background: "#f1f5f9", borderRadius: 10 }}>
                            <div style={{ height: "100%", borderRadius: 10, background: "#1a56db", width: `${d.total ? Math.round((d.assigned / d.total) * 100) : 0}%` }} />
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--gray-500)", minWidth: 30 }}>
                            {d.total ? Math.round((d.assigned / d.total) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Export */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Export Reports</div>
          <div className="card-subtitle">Download real PostgreSQL data</div>
        </div>
        <div className="card-body">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={exportCSV} disabled={!assets.length}>
              📥 Full Asset Report (CSV)
            </button>
            <button className="btn btn-secondary" disabled style={{ opacity: 0.5 }}>
              📄 Employee Asset Report (PDF) — coming soon
            </button>
          </div>
          {!assets.length && !loading && (
            <div style={{ fontSize: 12.5, color: "var(--gray-400)", marginTop: 10 }}>
              No data to export yet. Add some assets first.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
