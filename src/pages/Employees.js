import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import StatusPill from "../components/StatusPill";
import "../components/DetailDrawer.css";

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

  // Permanent vs Temporary assignment — starts unset so the admin must
  // consciously choose one; it can't be skipped by leaving a default in place.
  const [assignmentType, setAssignmentType] = useState("");
  const [temporaryReason, setTemporaryReason] = useState("");
  const [temporaryDurationDays, setTemporaryDurationDays] = useState("2");
  const [customDurationDays, setCustomDurationDays] = useState("");

  // Old asset condition
  const [oldAssetIssues, setOldAssetIssues] = useState("");

  // Post-assignment: "form" while filling in details, "emailChoice" once the
  // asset has been assigned and we're asking whether to email the employee now.
  const [stage, setStage] = useState("form");
  const [assignedAsset, setAssignedAsset] = useState(null); // { assetId, laptopName }
  const [sendingEmail, setSendingEmail] = useState(false);

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

  const effectiveDurationDays =
    temporaryDurationDays === "custom" ? Number(customDurationDays) : Number(temporaryDurationDays);

  const handleAssign = () => {
    if (!selectedAssetId) {
      toast("Please select an asset to assign.", "error");
      return;
    }
    if (!assignedDate) {
      toast("Assigned date is required.", "error");
      return;
    }
    if (!assignmentType) {
      toast("Please choose whether this is a Permanent or Temporary assignment.", "error");
      return;
    }
    if (assignmentType === "Temporary") {
      if (!temporaryReason.trim()) {
        toast("Please provide a reason for the temporary assignment.", "error");
        return;
      }
      if (!effectiveDurationDays || effectiveDurationDays <= 0) {
        toast("Please select a valid duration for the temporary assignment.", "error");
        return;
      }
    }
    const asset = availableAssets.find((a) => a.assetId === selectedAssetId);
    setAssigning(true);
    axios.put(`${API}/assets/assign/${selectedAssetId}`, {
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      employeeRole: employee.role || "EMPLOYEE",
      location: employee.location || "",
      assignedDate,
      remarks,
      assignmentType,
      temporaryReason: assignmentType === "Temporary" ? temporaryReason.trim() : undefined,
      temporaryDurationDays: assignmentType === "Temporary" ? effectiveDurationDays : undefined,
      oldAssetIssues: oldAssetIssues.trim() || undefined,
    })
      .then(() => {
        toast("Asset assigned successfully.", "success");
        setAssignedAsset({ assetId: selectedAssetId, laptopName: asset?.laptopName || "the asset" });
        setStage("emailChoice"); // ask "send the assignment email now, or later?"
        setAssigning(false);
      })
      .catch((err) => {
        toast(err.response?.data?.message || "Failed to assign asset.", "error");
        setAssigning(false);
      });
  };

  const handleSendEmailNow = () => {
    if (!assignedAsset) return;
    setSendingEmail(true);
    axios.post(`${API}/assets/send-email/${assignedAsset.assetId}`)
      .then(() => {
        toast("Assignment email sent.", "success");
        onSuccess();
      })
      .catch((err) => {
        toast(err.response?.data?.message || "Couldn't send the email — you can retry it later from the asset row.", "error");
        onSuccess();
      })
      .finally(() => setSendingEmail(false));
  };

  const handleSendEmailLater = () => {
    toast("You can send the assignment email anytime from the asset's row.", "info");
    onSuccess();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Modal */}
      <div
        className="modal-content"
        style={{ width: "min(780px, 96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h3 className="modal-title">Assign Asset</h3>
            <div className="card-subtitle" style={{ marginTop: 4 }}>
              Select an available asset to assign to this employee
            </div>
          </div>
          <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 26px", display: "flex", flexDirection: "column", gap: 20 }}>
        {stage === "form" ? (
          <>

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

          {/* Assignment Type: Permanent vs Temporary — only shown once an asset is selected */}
          {selectedAssetId && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gray-700)", marginBottom: 10 }}>
              Assignment Type *
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {["Permanent", "Temporary"].map((type) => (
                <label
                  key={type}
                  style={{
                    flex: 1,
                    display: "flex", alignItems: "center", gap: 8,
                    border: assignmentType === type ? "2px solid #1a56db" : "1.5px solid var(--gray-200)",
                    borderRadius: 10, padding: "10px 14px",
                    cursor: "pointer",
                    background: assignmentType === type ? "#eff6ff" : "#fff",
                    fontSize: 13, fontWeight: 700,
                    color: assignmentType === type ? "#1a56db" : "var(--gray-700)",
                  }}
                >
                  <input
                    type="radio"
                    name="assignmentType"
                    value={type}
                    checked={assignmentType === type}
                    onChange={() => setAssignmentType(type)}
                    style={{ accentColor: "#1a56db" }}
                  />
                  {type === "Permanent" ? "🔒 Permanent" : "⏳ Temporary"}
                </label>
              ))}
            </div>

            {assignmentType === "Temporary" && (
              <div style={{
                marginTop: 12, padding: "14px 16px",
                background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10,
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <div className="field" style={{ margin: 0 }}>
                  <label className="field-label">Reason for Temporary Assignment *</label>
                  <input
                    className="input"
                    placeholder="e.g. Employee's laptop is under repair"
                    value={temporaryReason}
                    onChange={(e) => setTemporaryReason(e.target.value)}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label className="field-label">How long will the laptop be assigned? *</label>
                  <select
                    className="form-select"
                    value={temporaryDurationDays}
                    onChange={(e) => setTemporaryDurationDays(e.target.value)}
                  >
                    <option value="1">1 day</option>
                    <option value="2">2 days</option>
                    <option value="3">3 days</option>
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="custom">Custom…</option>
                  </select>
                  {temporaryDurationDays === "custom" && (
                    <input
                      className="input"
                      type="number"
                      min="1"
                      style={{ marginTop: 8 }}
                      placeholder="Number of days"
                      value={customDurationDays}
                      onChange={(e) => setCustomDurationDays(e.target.value)}
                    />
                  )}
                  <div style={{ fontSize: 11.5, color: "var(--gray-500)", marginTop: 6 }}>
                    An email reminder will automatically be sent once this period expires, asking for
                    the laptop to be collected back.
                  </div>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Old Asset Condition */}
          <div className="field" style={{ margin: 0 }}>
            <label className="field-label">
              Any issues with the old asset? <span style={{ fontWeight: 400, color: "var(--gray-400)" }}>(optional)</span>
            </label>
            <textarea
              className="input"
              rows={2}
              style={{ resize: "vertical", width: "100%", boxSizing: "border-box", fontFamily: "inherit" }}
              placeholder="e.g. Cracked screen, battery not holding charge, missing charger…"
              value={oldAssetIssues}
              onChange={(e) => setOldAssetIssues(e.target.value)}
            />
          </div>
          </>
        ) : (
          /* Email choice — shown right after a successful assignment */
          <div style={{ textAlign: "center", padding: "24px 8px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--gray-900)", marginBottom: 6 }}>
              {assignedAsset?.laptopName} assigned to {employee.employeeName}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--gray-600)", marginBottom: 24, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
              Do you want to send the assignment notification email to the employee now, or send it later
              from the asset's row?
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn btn-secondary" onClick={handleSendEmailLater} disabled={sendingEmail}>
                Send Later
              </button>
              <button className="btn btn-primary" onClick={handleSendEmailNow} disabled={sendingEmail} style={{ minWidth: 150 }}>
                {sendingEmail ? "Sending…" : "📧 Send Now"}
              </button>
            </div>
          </div>
        )}
        </div>

        {/* Footer */}
        {stage === "form" && (
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
              disabled={assigning || !selectedAssetId || !assignmentType}
              style={{ minWidth: 140 }}
            >
              {assigning ? "Assigning…" : "✓ Assign Asset"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Employee Detail Drawer ─────────────────────────────────────────────────
function EmployeeDetailDrawer({ employee, assets, loadingAssets, onClose, onEdit, onDelete, onAssign }) {
  if (!employee) return null;
  return (
    <div className="detail-drawer-overlay" onClick={onClose}>
      <div className="detail-drawer" onClick={(e) => e.stopPropagation()}>

        {/* Hero */}
        <div className="detail-drawer-hero" style={{ background: `linear-gradient(135deg, ${avatarBg(employee.employeeName)}, #1e293b)` }}>
          <button className="detail-drawer-close" onClick={onClose} aria-label="Close">✕</button>
          <div className="detail-drawer-icon" style={{ fontSize: 20, fontWeight: 700 }}>
            {initials(employee.employeeName)}
          </div>
          <h3 className="detail-drawer-name">{employee.employeeName}</h3>
          <div className="detail-drawer-sub">
            {employee.employeeId}{employee.designation ? ` · ${employee.designation}` : ""}{employee.department ? ` · ${employee.department}` : ""}
          </div>
          <div className="detail-drawer-pills">
            {employee.mustChangePassword && <span className="pill" style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>Default password</span>}
          </div>
        </div>

        {/* Body */}
        <div className="detail-drawer-body">
          <div className="detail-drawer-section">
            <div className="detail-drawer-section-title">Profile</div>
            <div className="detail-drawer-grid">
              <div className="detail-drawer-stat">
                <div className="detail-drawer-stat-label">Email</div>
                <div className="detail-drawer-stat-value">{employee.email || "—"}</div>
              </div>
              <div className="detail-drawer-stat">
                <div className="detail-drawer-stat-label">Location</div>
                <div className="detail-drawer-stat-value">{employee.location || "—"}</div>
              </div>
              <div className="detail-drawer-stat">
                <div className="detail-drawer-stat-label">Department</div>
                <div className="detail-drawer-stat-value">{employee.department || "—"}</div>
              </div>
              <div className="detail-drawer-stat">
                <div className="detail-drawer-stat-label">Role</div>
                <div className="detail-drawer-stat-value">{employee.role || "—"}</div>
              </div>
            </div>
          </div>

          <div className="detail-drawer-section" style={{ marginBottom: 4 }}>
            <div className="detail-drawer-section-title">
              Assigned Assets {assets && assets.length > 0 && `(${assets.length})`}
            </div>
            {loadingAssets ? (
              <div style={{ fontSize: 12.5, color: "var(--gray-400)" }}>Loading assets…</div>
            ) : !assets || assets.length === 0 ? (
              <div className="detail-drawer-empty">
                Not currently assigned any assets.
              </div>
            ) : (
              <table className="detail-drawer-mini-table">
                <thead>
                  <tr><th>Asset</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {assets.map((item) => (
                    <tr key={item.assetId}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{item.laptopName}</div>
                        <div style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 1 }}>
                          {item.assetType}{item.brand ? ` · ${item.brand}` : ""}{item.model ? ` ${item.model}` : ""}
                        </div>
                      </td>
                      <td><StatusPill status={item.assetStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="detail-drawer-footer" style={{ flexWrap: "wrap" }}>
          <button className="btn btn-primary" style={{ flex: "1 1 auto" }} onClick={() => onAssign(employee)}>
            ➕ Assign Asset
          </button>
          <button className="btn btn-secondary" onClick={() => onEdit(employee)}>✏ Edit</button>
          <button className="btn btn-danger" onClick={() => onDelete(employee)}>🗑 Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Employees Page ───────────────────────────────────────────────────────
export default function Employees() {
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [viewingEmployee, setViewingEmployee] = useState(null);
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

  const openProfile = (emp) => {
    setViewingEmployee(emp);
    const key = emp.employeeId;
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

  const uniqueLocations = useMemo(() => {
    const fromData = employees.map((e) => e.location).filter(Boolean);
    const combined = Array.from(new Set([...LOCATIONS, ...fromData])).sort();
    return ["All", ...combined];
  }, [employees]);

  const directory = useMemo(
    () => employees.filter((e) =>
      ((e.employeeName || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.employeeId || "").toLowerCase().includes(search.toLowerCase()) ||
        (e.department || "").toLowerCase().includes(search.toLowerCase())) &&
      (locationFilter === "All" || e.location === locationFilter)
    ),
    [employees, search, locationFilter]
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
                <input className="input" {...field("employeeId")} placeholder="e.g. EMP006" />
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
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gray-500)" }}>
            {directory.length} of {employees.length} employees
            {locationFilter !== "All" && (
              <span style={{ marginLeft: 8, color: "var(--primary)" }}>
                · filtered by <strong>{locationFilter}</strong>
                <button
                  onClick={() => setLocationFilter("All")}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--primary)", fontWeight: 700, marginLeft: 6, fontSize: 13,
                  }}
                  title="Clear location filter"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        </div>
        <select
          className="input"
          style={{ width: 200 }}
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        >
          {uniqueLocations.map((loc) => (
            <option key={loc} value={loc}>{loc === "All" ? "All locations" : loc}</option>
          ))}
        </select>
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
          <div className="empty-sub">
            {search || locationFilter !== "All"
              ? "Try clearing the search or location filter."
              : "Add your first employee to get started."}
          </div>
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
                    onClick={() => openProfile(emp)}
                  >
                    {initials(emp.employeeName)}
                  </div>

                  {/* Name & meta */}
                  <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => openProfile(emp)}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                      {emp.mustChangePassword && <span className="tag tag-blue">Default password</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--gray-500)", marginTop: 2 }}>
                      {emp.employeeId} · {emp.designation || "—"} · {emp.department || "—"}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => openProfile(emp)}
                      title="View full profile and assigned assets"
                    >
                      👁 View
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setAssignTarget(emp)}
                      title="Assign an asset to this employee"
                    >
                      ➕ Assign Asset
                    </button>
                  </div>
                </div>
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

      <EmployeeDetailDrawer
        employee={viewingEmployee}
        assets={viewingEmployee ? expandedAssets[viewingEmployee.employeeId] : null}
        loadingAssets={viewingEmployee ? !expandedAssets[viewingEmployee.employeeId] : false}
        onClose={() => setViewingEmployee(null)}
        onEdit={(emp) => { setViewingEmployee(null); startEdit(emp); }}
        onDelete={(emp) => { setViewingEmployee(null); deleteEmployee(emp); }}
        onAssign={(emp) => { setViewingEmployee(null); setAssignTarget(emp); }}
      />
    </Layout>
  );
}
