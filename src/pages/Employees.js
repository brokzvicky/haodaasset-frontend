import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import StatusPill from "../components/StatusPill";

const API = "https://haodaasset-backend-1.onrender.com";

const EMPTY_FORM = {
  employeeId: "", employeeName: "", email: "",
  department: "", designation: "", location: "",
};

const LOCATIONS = ["Chennai - Kilpauk", "Chennai - Chetpet"];

function avatarBg(name) {
  const colors = ["#1a56db", "#059669", "#7c3aed", "#b45309", "#be185d", "#0284c7"];
  return colors[(name || "A").charCodeAt(0) % colors.length];
}

function initials(name) {
  return (name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Assign Asset Modal ────────────────────────────────────────────────────────
function AssignAssetModal({ employee, onClose, onSuccess }) {
  const toast = useToast();
  const [availableAssets, setAvailableAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [assignedDate, setAssignedDate] = useState(new Date().toISOString().split("T")[0]);
  const [remarks, setRemarks] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    setLoadingAssets(true);
    axios.get(`${API}/assets/available`)
      .then((r) => setAvailableAssets(r.data))
      .catch(() => setAvailableAssets([]))
      .finally(() => setLoadingAssets(false));
  }, []);

  const filteredAssets = useMemo(() => {
    const q = assetSearch.toLowerCase();
    return availableAssets.filter((a) =>
      (a.laptopName || "").toLowerCase().includes(q) ||
      (a.assetType || "").toLowerCase().includes(q) ||
      (a.brand || "").toLowerCase().includes(q) ||
      (a.model || "").toLowerCase().includes(q) ||
      (a.serialNumber || "").toLowerCase().includes(q) ||
      (a.location || "").toLowerCase().includes(q)
    );
  }, [availableAssets, assetSearch]);
  
  const handleAssign = () => {
    if (!selectedAssetId) {
      toast("Please select an asset to assign.", "error");
      return;
    }
    if (!assignedDate) {
      toast("Assigned date is required.", "error");
      return;
    }
    setAssigning(true);
    axios.put(`${API}/assets/assign/${selectedAssetId}`, {
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      employeeRole: employee.role || "EMPLOYEE",
      location: employee.location || "",
      assignedDate,
      remarks,
    })
      .then(() => {
        toast("Asset assigned successfully.", "success");
        onSuccess();
      })
      .catch((err) => {
        toast(err.response?.data?.message || "Failed to assign asset.", "error");
        setAssigning(false);
      });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
          zIndex: 800, backdropFilter: "blur(4px)",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        background: "#fff", borderRadius: 18,
        width: "min(780px, 96vw)", maxHeight: "90vh",
        zIndex: 900,
        boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        animation: "modalIn 0.2s ease",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 26px",
          borderBottom: "1px solid var(--gray-100)",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--gray-900)" }}>
              Assign Asset
            </div>
            <div style={{ fontSize: 12.5, color: "var(--gray-400)", marginTop: 2 }}>
              Select an available asset to assign to this employee
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34, borderRadius: 9,
              border: "1px solid var(--gray-200)", background: "#fff",
              cursor: "pointer", fontSize: 16, color: "var(--gray-400)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 26px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Employee Info */}
          <div style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
            border: "1px solid #dbeafe",
            borderRadius: 12, padding: "16px 18px",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "#1d4ed8", marginBottom: 12 }}>
              Employee Information
            </div>
            <div className="kpi-row kpi-row-4 stagger-in">
              {[
                { label: "Employee ID", value: employee.employeeId },
                { label: "Employee Name", value: employee.employeeName },
                { label: "Department", value: employee.department || "—" },
                { label: "Location", value: employee.location || "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--gray-900)" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Asset Search */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-700)", marginBottom: 10 }}>
              Available Assets
              {!loadingAssets && (
                <span style={{ fontWeight: 500, color: "var(--gray-400)", fontSize: 12, marginLeft: 8 }}>
                  ({filteredAssets.length} of {availableAssets.length})
                </span>
              )}
            </div>

            {/* Search bar */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none" }}
                width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="input"
                style={{ paddingLeft: 32, width: "100%", boxSizing: "border-box" }}
                placeholder="Search by name, type, brand, model, serial, location…"
                value={assetSearch}
                onChange={(e) => setAssetSearch(e.target.value)}
              />
              {assetSearch && (
                <button
                  onClick={() => setAssetSearch("")}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", fontSize: 13 }}
                >✕</button>
              )}
            </div>

            {/* Asset list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", paddingRight: 2 }}>
              {loadingAssets ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--gray-400)", fontSize: 13 }}>
                  <div className="loading-spinner" style={{ margin: "0 auto 10px", width: 22, height: 22 }} />
                  Loading available assets…
                </div>
              ) : filteredAssets.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>📦</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-500)" }}>
                    {assetSearch ? "No assets match your search." : "No available assets in inventory."}
                  </div>
                </div>
              ) : filteredAssets.map((asset) => {
                const isSelected = selectedAssetId === asset.assetId;
                return (
                  <label
                    key={asset.assetId}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 14,
                      border: isSelected ? "2px solid #1a56db" : "1.5px solid var(--gray-200)",
                      borderRadius: 12, padding: "12px 14px",
                      cursor: "pointer",
                      background: isSelected ? "#eff6ff" : "#fff",
                      boxShadow: isSelected ? "0 0 0 3px #1a56db18" : "none",
                      transition: "all 0.13s",
                    }}
                  >
                    <input
                      type="radio"
                      name="assignAsset"
                      value={asset.assetId}
                      checked={isSelected}
                      onChange={() => setSelectedAssetId(asset.assetId)}
                      style={{ marginTop: 2, accentColor: "#1a56db", flexShrink: 0 }}
                    />
                    <div className="asset-row-grid">
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--gray-900)" }}>{asset.laptopName}</div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>Asset Name</div>
                      </div>
                      <div>
                        <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 5, background: "#eff6ff", color: "#1d4ed8", fontSize: 11, fontWeight: 700 }}>
                          {asset.assetType}
                        </span>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 3 }}>Type</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-700)" }}>{asset.brand}</div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>Brand</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--gray-700)" }}>{asset.model || "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>Model</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11, background: "var(--gray-100)", padding: "2px 6px", borderRadius: 4, color: "var(--gray-600)", display: "inline-block" }}>
                          {asset.serialNumber}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 3 }}>Serial No.</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: "var(--gray-600)" }}>{asset.location || "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>Location</div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <StatusPill status={asset.assetStatus} />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Assignment Details */}
          <div className="grid-1-2">
            <div className="field">
              <label className="field-label">Assigned Date *</label>
              <input
                className="input"
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">Remarks <span style={{ fontWeight: 400, color: "var(--gray-400)" }}>(optional)</span></label>
              <input
                className="input"
                placeholder="e.g. Issued for project work, replacement for old device…"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", gap: 10, justifyContent: "flex-end",
          padding: "16px 26px",
          borderTop: "1px solid var(--gray-100)",
          flexShrink: 0,
          background: "#fafafa",
        }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={assigning}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAssign}
            disabled={assigning || !selectedAssetId}
            style={{ minWidth: 140 }}
          >
            {assigning ? "Assigning…" : "✓ Assign Asset"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.95); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}

// ─── Main Employees Page ───────────────────────────────────────────────────────
export default function Employees() {
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [expandedAssets, setExpandedAssets] = useState({});
  const [assetCounts, setAssetCounts] = useState({});

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Assign Asset modal state
  const [assignTarget, setAssignTarget] = useState(null);

  const loadEmployees = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/admin/employees`)
      .then((r) => {
        const emps = r.data;
        setEmployees(emps);
        setError("");
        // Load asset counts for all employees
        Promise.all(
          emps.map((emp) =>
            axios.get(`${API}/api/admin/employees/${emp.employeeId}/assets`)
              .then((res) => ({ id: emp.employeeId, count: res.data.length }))
              .catch(() => ({ id: emp.employeeId, count: 0 }))
          )
        ).then((results) => {
          const counts = {};
          results.forEach(({ id, count }) => { counts[id] = count; });
          setAssetCounts(counts);
        });
      })
      .catch(() => { setEmployees([]); setError("Couldn't load the employee directory. Is the API running?"); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const getEmployeeIdentifier = (emp) => emp?.id ?? emp?.employeeId;

  const startCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };

  const startEdit = (emp) => {
    setEditingId(getEmployeeIdentifier(emp));
    setForm({
      employeeId: emp.employeeId,
      employeeName: emp.employeeName || "",
      email: emp.email || "",
      department: emp.department || "",
      designation: emp.designation || "",
      location: emp.location || "",
    });
    setShowForm(true);
  };

  const saveEmployee = () => {
    if (!form.employeeName || (!editingId && !form.employeeId)) {
      toast("Employee ID and name are required.", "error");
      return;
    }
    setSaving(true);
    const request = editingId
      ? axios.put(`${API}/api/admin/employees/${encodeURIComponent(editingId)}`, form)
      : axios.post(`${API}/api/admin/employees`, form);

    request
      .then(() => {
        toast(editingId ? "Employee updated." : "Employee created. Default password: Haoda@321", "success");
        setShowForm(false);
        setForm(EMPTY_FORM);
        setEditingId(null);
        loadEmployees();
      })
      .catch((err) => toast(err.response?.data?.message || "Couldn't save employee.", "error"))
      .finally(() => setSaving(false));
  };

  const deleteEmployee = (emp) => {
    const employeeIdentifier = getEmployeeIdentifier(emp);
    if (!window.confirm(`Remove ${emp.employeeName} (${emp.employeeId}) from the directory?`)) return;
    axios.delete(`${API}/api/admin/employees/${encodeURIComponent(employeeIdentifier)}`)
      .then(() => { toast("Employee deleted.", "success"); loadEmployees(); })
      .catch(() => toast("Couldn't delete employee.", "error"));
  };

  const toggleExpand = (emp) => {
    const key = emp.employeeId;
    if (expanded === key) { setExpanded(null); return; }
    setExpanded(key);
    if (!expandedAssets[key]) {
      axios.get(`${API}/api/admin/employees/${key}/assets`)
        .then((r) => setExpandedAssets((prev) => ({ ...prev, [key]: r.data })))
        .catch(() => setExpandedAssets((prev) => ({ ...prev, [key]: [] })));
    }
  };

  const handleAssignSuccess = () => {
    setAssignTarget(null);
    // Refresh employees + clear expanded assets cache so they reload fresh
    setExpandedAssets({});
    loadEmployees();
  };

  const directory = useMemo(
    () => employees.filter((e) =>
      (e.employeeName || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.employeeId || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.department || "").toLowerCase().includes(search.toLowerCase())
    ),
    [employees, search]
  );

  return (
    <Layout
      title="Employees"
      subtitle="Manage your organization's employee directory"
      actions={
        <button className="btn btn-primary" onClick={showForm ? () => setShowForm(false) : startCreate}>
          {showForm ? "✕ Cancel" : "➕ Add Employee"}
        </button>
      }
    >
      {error && (
        <div className="card" style={{ marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2", padding: "12px 18px", fontSize: 13, color: "#991b1b" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card fade-in" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">{editingId ? "Edit Employee" : "Add New Employee"}</div>
              <div className="card-subtitle">
                {editingId
                  ? "Update this employee's profile details"
                  : "New employees get the default password Haoda@321 and must change it on first login"}
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Employee ID *</label>
                <input className="input" {...field("employeeId")} placeholder="e.g. EMP006" disabled={!!editingId} />
              </div>
              <div className="field">
                <label className="field-label">Full Name *</label>
                <input className="input" {...field("employeeName")} placeholder="Jane Doe" />
              </div>
              <div className="field">
                <label className="field-label">Email</label>
                <input className="input" type="email" {...field("email")} placeholder="jane.doe@company.com" />
              </div>
              <div className="field">
                <label className="field-label">Department</label>
                <input className="input" {...field("department")} placeholder="Engineering" />
              </div>
              <div className="field">
                <label className="field-label">Designation</label>
                <input className="input" {...field("designation")} placeholder="Software Engineer" />
              </div>
              <div className="field">
                <label className="field-label">Location</label>
                <select className="input" {...field("location")}>
                  <option value="">Select branch…</option>
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button className="btn btn-primary" onClick={saveEmployee} disabled={saving}>
                {saving ? "Saving…" : editingId ? "✓ Save Changes" : "✓ Create Employee"}
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-500)" }}>
            {directory.length} of {employees.length} employees
          </div>
        </div>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)" }}>🔍</span>
          <input
            className="input"
            style={{ width: 240, paddingLeft: 32 }}
            placeholder="Search employee, ID, dept…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Employee Cards */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1,2,3,4].map((i) => (
            <div key={i} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 22px" }}>
                <div className="skeleton skeleton-circle" style={{ width: 44, height: 44, borderRadius: 12 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="skeleton skeleton-text short" />
                  <div className="skeleton skeleton-text medium" style={{ height: 9 }} />
                </div>
                <div className="skeleton" style={{ width: 60, height: 24, borderRadius: 8 }} />
              </div>
            </div>
          ))}
        </div>
      ) : directory.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-title">No employees found</div>
          <div className="empty-sub">Add your first employee to get started.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {directory.map((emp) => {
            const count = assetCounts[emp.employeeId];
            return (
              <div key={emp.employeeId} className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 22px" }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: avatarBg(emp.employeeName),
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 700, color: "#fff", cursor: "pointer",
                    }}
                    onClick={() => toggleExpand(emp)}
                  >
                    {initials(emp.employeeName)}
                  </div>

                  {/* Name & meta */}
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleExpand(emp)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: "var(--gray-900)" }}>
                        {emp.employeeName}
                      </span>
                      {count > 0 && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "2px 8px", borderRadius: 999,
                          background: "#dbeafe", color: "#1d4ed8",
                          fontSize: 11, fontWeight: 700,
                        }}>
                          📦 {count} {count === 1 ? "asset" : "assets"}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--gray-500)", marginTop: 2 }}>
                      {emp.employeeId} · {emp.designation || "—"} · {emp.department || "—"}
                    </div>
                  </div>

                  {emp.mustChangePassword && <span className="tag tag-blue">Default password</span>}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => toggleExpand(emp)}
                      title="View assigned assets"
                    >
                      📦 View Assets
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setAssignTarget(emp)}
                      title="Assign an asset to this employee"
                    >
                      ➕ Assign Asset
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => startEdit(emp)}>
                      ✏ Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteEmployee(emp)}>
                      🗑 Delete
                    </button>
                    <span
                      style={{ color: "var(--gray-400)", fontSize: 13, cursor: "pointer", padding: "0 2px" }}
                      onClick={() => toggleExpand(emp)}
                    >
                      {expanded === emp.employeeId ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Expanded asset panel */}
                {expanded === emp.employeeId && (
                  <div style={{ borderTop: "1px solid var(--gray-100)", padding: "14px 22px 18px" }}>
                    <div className="grid-3" style={{ gap: 12, marginBottom: 14 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase" }}>Email</div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{emp.email || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase" }}>Location</div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{emp.location || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gray-400)", textTransform: "uppercase" }}>Role</div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{emp.role}</div>
                      </div>
                    </div>

                    <div className="card-subtitle" style={{ marginBottom: 8 }}>Assigned Assets</div>
                    {!expandedAssets[emp.employeeId] ? (
                      <div style={{ fontSize: 12.5, color: "var(--gray-400)" }}>Loading assets…</div>
                    ) : expandedAssets[emp.employeeId].length === 0 ? (
                      <div style={{ fontSize: 12.5, color: "var(--gray-400)" }}>
                        No assets currently assigned.{" "}
                        <span
                          style={{ color: "#1a56db", cursor: "pointer", fontWeight: 600 }}
                          onClick={() => setAssignTarget(emp)}
                        >
                          Assign one now →
                        </span>
                      </div>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr><th>Type</th><th>Asset</th><th>Brand</th><th>Model</th><th>Serial No.</th><th>Assigned Date</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {expandedAssets[emp.employeeId].map((item) => (
                            <tr key={item.assetId}>
                              <td><span className="tag tag-blue">{item.assetType}</span></td>
                              <td style={{ fontWeight: 500 }}>{item.laptopName}</td>
                              <td>{item.brand}</td>
                              <td style={{ color: "var(--gray-500)", fontSize: 13 }}>{item.model || "—"}</td>
                              <td>
                                <span style={{ fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11, background: "var(--gray-100)", padding: "2px 6px", borderRadius: 4, color: "var(--gray-600)" }}>
                                  {item.serialNumber}
                                </span>
                              </td>
                              <td style={{ fontSize: 13, color: "var(--gray-500)" }}>{item.assignedDate || "—"}</td>
                              <td><StatusPill status={item.assetStatus} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Asset Modal */}
      {assignTarget && (
        <AssignAssetModal
          employee={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSuccess={handleAssignSuccess}
        />
      )}
    </Layout>
  );
}
