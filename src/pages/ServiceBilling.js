import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";
import "./ServiceBilling.css";

const API = "https://haodaasset-backend-1.onrender.com";

const STATUS_OPTIONS = ["Paid", "Pending", "Overdue"];
const SERVICE_OPTIONS = [
  "Internet / ISP", "AMC - Laptops", "AMC - Printers", "AMC - Servers",
  "Software Subscription", "Cloud Hosting", "Antivirus License",
  "CCTV Maintenance", "Networking Maintenance", "Other",
];

const EMPTY_FORM = {
  service: "", vendor: "", amount: "", paymentDate: "",
  status: "Pending", remarks: "",
};

function authHeader() {
  const token = sessionStorage.getItem("iam_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatCurrency(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "₹0";
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

// ── Status badge ─────────────────────────────────────────────────
function BillingStatusBadge({ status }) {
  const cfg = {
    Paid:    { bg: "var(--success-bg)", color: "var(--success)", border: "var(--success-border)" },
    Pending: { bg: "var(--warning-bg)", color: "var(--warning)", border: "var(--warning-border)" },
    Overdue: { bg: "var(--danger-bg)",  color: "var(--danger)",  border: "var(--danger-border)"  },
  }[status] || { bg: "var(--gray-100)", color: "var(--gray-600)", border: "var(--gray-200)" };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      fontSize: 11.5, fontWeight: 700, letterSpacing: "0.01em",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
      {status}
    </span>
  );
}

// ── Skeleton row ───────────────────────────────────────────────────
const SkeletonRow = () => {
  const cell = (w = 80) => (
    <td><div className="skeleton skeleton-text" style={{ width: w, margin: 0 }} /></td>
  );
  return <tr>{cell(140)}{cell(120)}{cell(90)}{cell(100)}{cell(80)}{cell(120)}{cell(100)}{cell(140)}</tr>;
};

export default function ServiceBilling() {
  const toast = useToast();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState({
    totalPayments: null, paidServices: null, pendingServices: null,
    overdueServices: null, totalInvoicesUploaded: null,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = add mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortDir, setSortDir] = useState("desc"); // sort by payment date

  const [viewingPayment, setViewingPayment] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // ── Data loading ──────────────────────────────────────────────
  const loadData = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/api/admin/service-billing`)
      .then((r) => { setPayments(r.data); setError(""); })
      .catch(() => { setPayments([]); setError("Couldn't load service payments. Is the API running?"); })
      .finally(() => setLoading(false));
  }, []);

  const loadDashboard = useCallback(() => {
    axios.get(`${API}/api/admin/service-billing/dashboard`)
      .then((r) => setDashboard(r.data))
      .catch(() => { /* KPI cards simply show 0 if this fails */ });
  }, []);

  useEffect(() => { loadData(); loadDashboard(); }, [loadData, loadDashboard]);

  // ── Form helpers ──────────────────────────────────────────────
  const field = (key) => ({
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setInvoiceFile(null);
    setEditingId(null);
  };

  const openAddForm = () => { resetForm(); setShowForm(true); };

  const openEditForm = (payment) => {
    setEditingId(payment.id);
    setForm({
      service: payment.service || "",
      vendor: payment.vendor || "",
      amount: payment.amount != null ? String(payment.amount) : "",
      paymentDate: payment.paymentDate || "",
      status: payment.status || "Pending",
      remarks: payment.remarks || "",
    });
    setInvoiceFile(null);
    setShowForm(true);
  };

  const cancelForm = () => { setShowForm(false); resetForm(); };

  // ── Save (create or update) ─────────────────────────────────────
  const savePayment = () => {
    const required = [
      ["service", "Service"],
      ["vendor", "Vendor"],
      ["amount", "Amount"],
      ["paymentDate", "Payment Date"],
      ["status", "Status"],
    ];
    for (const [k, label] of required) {
      if (!String(form[k] ?? "").trim()) {
        toast(`${label} is required.`, "error");
        return;
      }
    }
    if (Number(form.amount) < 0 || Number.isNaN(Number(form.amount))) {
      toast("Amount must be a valid positive number.", "error");
      return;
    }
    if (invoiceFile && invoiceFile.type !== "application/pdf") {
      toast("Only PDF files are allowed for the invoice.", "error");
      return;
    }

    const data = new FormData();
    data.append("service", form.service.trim());
    data.append("vendor", form.vendor.trim());
    data.append("amount", form.amount);
    data.append("paymentDate", form.paymentDate);
    data.append("status", form.status);
    data.append("remarks", form.remarks || "");
    if (invoiceFile) data.append("invoiceFile", invoiceFile);

    setSaving(true);
    const req = editingId
      ? axios.put(`${API}/api/admin/service-billing/${editingId}`, data, { headers: authHeader() })
      : axios.post(`${API}/api/admin/service-billing`, data, { headers: authHeader() });

    req
      .then(() => {
        toast(editingId ? "Service payment updated." : "Service payment added.", "success");
        setShowForm(false);
        resetForm();
        loadData();
        loadDashboard();
      })
      .catch((err) => {
        toast(err.response?.data?.message || "Failed to save the service payment.", "error");
      })
      .finally(() => setSaving(false));
  };

  // ── Delete ────────────────────────────────────────────────────
  const deletePayment = (payment) => {
    if (!window.confirm(`Permanently delete the payment record for "${payment.service}" (${payment.vendor})? This cannot be undone.`)) {
      return;
    }
    setDeletingId(payment.id);
    axios.delete(`${API}/api/admin/service-billing/${payment.id}`, { headers: authHeader() })
      .then(() => {
        toast("Service payment deleted.", "success");
        loadData();
        loadDashboard();
      })
      .catch((err) => toast(err.response?.data?.message || "Failed to delete the service payment.", "error"))
      .finally(() => setDeletingId(null));
  };

  // ── Invoice view / download ──────────────────────────────────────
  const openInvoice = async (payment, mode) => {
    try {
      const response = await axios.get(
        `${API}/api/admin/service-billing/${payment.id}/invoice/${mode}`,
        { responseType: "blob", headers: authHeader() }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (mode === "view") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${payment.service || "invoice"}-${payment.vendor || ""}.pdf`.replace(/\s+/g, "_");
        a.click();
      }
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      toast(err.response?.data?.message || "Couldn't open the invoice.", "error");
    }
  };

  // ── Derived data ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchText.toLowerCase();
    return payments
      .filter((p) =>
        (p.service || "").toLowerCase().includes(q) ||
        (p.vendor || "").toLowerCase().includes(q)
      )
      .filter((p) => statusFilter === "All" || p.status === statusFilter)
      .slice()
      .sort((a, b) => {
        const da = new Date(a.paymentDate).getTime() || 0;
        const db = new Date(b.paymentDate).getTime() || 0;
        return sortDir === "asc" ? da - db : db - da;
      });
  }, [payments, searchText, statusFilter, sortDir]);

  const kpis = [
    { label: "Total Payments",   value: dashboard.totalPayments,        icon: "🧾", color: "var(--primary)", filterStatus: "All" },
    { label: "Paid",             value: dashboard.paidServices,         icon: "✅", color: "var(--success)", filterStatus: "Paid" },
    { label: "Pending",          value: dashboard.pendingServices,      icon: "⏳", color: "var(--warning)", filterStatus: "Pending" },
    { label: "Overdue",          value: dashboard.overdueServices,      icon: "⚠️", color: "var(--danger)",  filterStatus: "Overdue" },
    { label: "Invoices Uploaded",value: dashboard.totalInvoicesUploaded,icon: "📎", color: "#7c3aed",        filterStatus: null },
  ];

  return (
    <Layout
      title="Service Billing"
      subtitle="Track vendor service payments and invoices"
      actions={
        <button className="btn btn-primary" onClick={() => (showForm ? cancelForm() : openAddForm())} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {showForm ? "✕ Cancel" : "+ Add Service Payment"}
        </button>
      }
    >
      {/* Error banner */}
      {error && (
        <div className="card" style={{
          marginBottom: 20, borderColor: "#fecaca", background: "#fef2f2",
          padding: "12px 18px", fontSize: 13, color: "#991b1b",
          display: "flex", gap: 8, alignItems: "center",
        }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="service-billing-kpi-row" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 28 }}>
        {kpis.map((k) => {
          const active = k.filterStatus !== null && statusFilter === k.filterStatus;
          return (
            <div
              key={k.label}
              onClick={() => { if (k.filterStatus !== null) setStatusFilter(active ? "All" : k.filterStatus); }}
              style={{
                background: "#fff", borderRadius: 12, padding: "16px 18px",
                borderLeft: `4px solid ${k.color}`,
                boxShadow: active ? `0 0 0 2px ${k.color}30, var(--shadow-sm)` : "var(--shadow-xs)",
                cursor: k.filterStatus !== null ? "pointer" : "default",
                transition: "all 0.15s ease",
                transform: active ? "translateY(-2px)" : "none",
                border: active ? `1px solid ${k.color}40` : "1px solid transparent",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: loading ? "var(--gray-300)" : k.color, lineHeight: 1.2 }}>
                    {loading || k.value == null ? "—" : k.value}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gray-400)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {k.label}
                  </div>
                </div>
                <div style={{ fontSize: 24, opacity: 0.5 }}>{k.icon}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add / Edit Service Payment Form ── */}
      {showForm && (
        <div className="card" style={{ marginBottom: 28, animation: "fadeIn 0.2s ease" }}>
          <div className="card-header">
            <div>
              <div className="card-title">{editingId ? "Edit Service Payment" : "Add Service Payment"}</div>
              <div className="card-subtitle">
                {editingId ? "Update the payment details below" : "Fill in the details below to record a service payment"}
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-section-label">Payment Details</div>
            <div className="form-grid">
              <div className="field">
                <label className="field-label">Service *</label>
                <input className="input" list="service-billing-services" {...field("service")} placeholder="e.g. Internet / ISP" />
                <datalist id="service-billing-services">
                  {SERVICE_OPTIONS.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
              <div className="field">
                <label className="field-label">Vendor *</label>
                <input className="input" {...field("vendor")} placeholder="e.g. Airtel Business" />
              </div>
              <div className="field">
                <label className="field-label">Amount (₹) *</label>
                <input className="input" type="number" min="0" step="0.01" {...field("amount")} placeholder="15000" />
              </div>
              <div className="field">
                <label className="field-label">Payment Date *</label>
                <input className="input" type="date" {...field("paymentDate")} />
              </div>
              <div className="field">
                <label className="field-label">Status *</label>
                <select className="input" {...field("status")}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Upload Invoice (PDF only)</label>
                <input
                  className="input"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                />
                {editingId && !invoiceFile && (
                  <span style={{ fontSize: 11.5, color: "var(--gray-400)" }}>
                    Leave empty to keep the existing invoice.
                  </span>
                )}
              </div>
              <div className="field" style={{ gridColumn: "span 3" }}>
                <label className="field-label">Remarks (optional)</label>
                <input className="input" {...field("remarks")} placeholder="Any additional notes" />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--gray-100)" }}>
              <button className="btn btn-primary" onClick={savePayment} disabled={saving}>
                {saving ? "Saving…" : editingId ? "✓ Save Changes" : "✓ Save Payment"}
              </button>
              <button className="btn btn-secondary" onClick={cancelForm}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Service Payments Table ── */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="card-title">Service Payments</div>
            <div className="card-subtitle">
              {loading ? "Loading…" : `${filtered.length} of ${payments.length} payments`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select className="input" style={{ width: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">All statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select className="input" style={{ width: 170 }} value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
              <option value="desc">Payment Date: Newest First</option>
              <option value="asc">Payment Date: Oldest First</option>
            </select>
            <div style={{ position: "relative" }}>
              <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", pointerEvents: "none" }}
                width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                className="input"
                style={{ paddingLeft: 34, width: 210 }}
                placeholder="Search service or vendor…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              {searchText && (
                <button
                  onClick={() => setSearchText("")}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--gray-400)", fontSize: 14 }}
                >✕</button>
              )}
            </div>
            <button className="btn btn-secondary btn-icon" onClick={() => { loadData(); loadDashboard(); }} disabled={loading} style={{ fontSize: 16 }}>
              ↻
            </button>
          </div>
        </div>

        {loading ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service</th><th>Vendor</th><th>Amount</th><th>Payment Date</th>
                  <th>Status</th><th>Invoice</th><th>Remarks</th><th style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>{[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}</tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>🧾</div>
            <div className="empty-title">
              {searchText || statusFilter !== "All" ? "No payments match your filters" : "No service payments recorded yet"}
            </div>
            <div className="empty-sub">
              {searchText || statusFilter !== "All"
                ? "Try adjusting your search or filter."
                : "Click 'Add Service Payment' to record your first vendor payment."}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service</th><th>Vendor</th><th>Amount</th><th>Payment Date</th>
                  <th>Status</th><th>Invoice</th><th>Remarks</th><th style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: "var(--gray-900)" }}>{p.service}</td>
                    <td style={{ color: "var(--gray-700)" }}>{p.vendor}</td>
                    <td className="mono" style={{ fontWeight: 700, color: "var(--gray-800)" }}>{formatCurrency(p.amount)}</td>
                    <td style={{ color: "var(--gray-600)", whiteSpace: "nowrap" }}>{formatDate(p.paymentDate)}</td>
                    <td><BillingStatusBadge status={p.status} /></td>
                    <td>
                      {p.invoicePath ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="action-view" onClick={() => openInvoice(p, "view")} title="View PDF invoice">
                            👁 View
                          </button>
                          <button className="action-view" onClick={() => openInvoice(p, "download")} title="Download PDF invoice">
                            ⬇ Download
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "var(--gray-300)", fontSize: 12 }}>No invoice</span>
                      )}
                    </td>
                    <td style={{ color: "var(--gray-500)", fontSize: 12.5, maxWidth: 180 }}>
                      {p.remarks || "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button className="action-view" onClick={() => setViewingPayment(p)} title="View payment details">
                          👁
                        </button>
                        <button className="action-edit" onClick={() => openEditForm(p)} title="Edit payment">
                          ✏️
                        </button>
                        <button
                          className="action-delete"
                          onClick={() => deletePayment(p)}
                          disabled={deletingId === p.id}
                          title="Delete payment"
                        >
                          {deletingId === p.id ? "⏳" : "🗑"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── View Payment Detail Modal ── */}
      {viewingPayment && (
        <div className="modal-overlay" onClick={() => setViewingPayment(null)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 className="modal-title">Service Payment Details</h3>
                <div className="card-subtitle" style={{ marginTop: 4 }}>{viewingPayment.service} · {viewingPayment.vendor}</div>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setViewingPayment(null)} aria-label="Close">✕</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                <div>
                  <div className="field-label">Service</div>
                  <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{viewingPayment.service}</div>
                </div>
                <div>
                  <div className="field-label">Vendor</div>
                  <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{viewingPayment.vendor}</div>
                </div>
                <div>
                  <div className="field-label">Amount</div>
                  <div style={{ fontWeight: 700, color: "var(--gray-900)" }}>{formatCurrency(viewingPayment.amount)}</div>
                </div>
                <div>
                  <div className="field-label">Payment Date</div>
                  <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>{formatDate(viewingPayment.paymentDate)}</div>
                </div>
                <div>
                  <div className="field-label">Status</div>
                  <div style={{ marginTop: 4 }}><BillingStatusBadge status={viewingPayment.status} /></div>
                </div>
                <div>
                  <div className="field-label">Invoice</div>
                  <div style={{ fontWeight: 600, color: "var(--gray-900)" }}>
                    {viewingPayment.invoicePath ? "Uploaded" : "Not uploaded"}
                  </div>
                </div>
              </div>
              {viewingPayment.remarks && (
                <div>
                  <div className="field-label">Remarks</div>
                  <div style={{ color: "var(--gray-700)", marginTop: 4 }}>{viewingPayment.remarks}</div>
                </div>
              )}
              {viewingPayment.invoicePath && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => openInvoice(viewingPayment, "view")}>👁 View Invoice</button>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => openInvoice(viewingPayment, "download")}>⬇ Download</button>
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setViewingPayment(null)}>Close</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { const p = viewingPayment; setViewingPayment(null); openEditForm(p); }}>✏️ Edit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .action-view {
          background: var(--primary-50);
          border: 1px solid var(--primary-200);
          color: var(--primary-700);
          border-radius: 7px;
          padding: 5px 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex; align-items: center; gap: 4px;
          white-space: nowrap;
        }
        .action-view:hover { background: var(--primary-100); transform: translateY(-1px); }
        .action-edit {
          background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8;
          border-radius: 7px; padding: 5px 10px; font-size: 13px; cursor: pointer;
          transition: all 0.15s ease; display: flex; align-items: center; gap: 4px;
        }
        .action-edit:hover { background: #dbeafe; border-color: #93c5fd; transform: translateY(-1px); }
        .action-delete {
          background: transparent; border: none; color: var(--gray-400);
          cursor: pointer; font-size: 18px; padding: 4px 6px; border-radius: 6px; transition: 0.15s;
        }
        .action-delete:hover { background: #fee2e2; color: #ef4444; }
        .action-delete:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </Layout>
  );
}
