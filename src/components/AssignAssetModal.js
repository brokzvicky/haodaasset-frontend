import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AssignAssetModal.css";

const API = "https://haodaasset-backend-1.onrender.com";

export default function AssignAssetModal({
  open,
  request,
  onClose,
  onAssigned,
}) {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState("");
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError("");
    setSelectedAsset("");

    axios
      .get(`${API}/assets/available`)
      .then((res) => {
        setAssets(res.data);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load available assets.");
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open || !request) return null;

  const assignAsset = async () => {
    if (!selectedAsset) {
      setError("Please select an asset.");
      return;
    }

    setAssigning(true);
    setError("");

    try {
      await axios.put(`${API}/assets/assign/${selectedAsset}`, {
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        employeeRole: request.employeeRole,
        location: request.location,
        remarks: request.reason,
      });

      onAssigned(selectedAsset);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Unable to assign asset.");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Assign Asset</h2>
        </div>

        <div className="modal-body">
          <div className="modal-grid">
            <div className="modal-info-group">
              <span className="modal-label">Employee</span>
              <span className="modal-value">{request.employeeName}</span>
            </div>
            <div className="modal-info-group">
              <span className="modal-label">Employee ID</span>
              <span className="modal-value">{request.employeeId}</span>
            </div>
            <div className="modal-info-group" style={{ gridColumn: "1 / -1" }}>
              <span className="modal-label">Requested Asset Type</span>
              <span className="modal-value">{request.assetType}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="modal-label" htmlFor="assign-asset-select">
              Select Available Asset
            </label>

            {loading ? (
              <div className="empty-state" style={{ padding: "24px 0" }}>
                <div className="empty-title">Loading available assets…</div>
              </div>
            ) : assets.length === 0 ? (
              <div className="empty-state" style={{ padding: "24px 0" }}>
                <div className="empty-title">No available assets</div>
                <div className="empty-sub">
                  Add a new asset to inventory or wait for one to be returned.
                </div>
              </div>
            ) : (
              <select
                id="assign-asset-select"
                className="form-select"
                value={selectedAsset}
                onChange={(e) => {
                  setSelectedAsset(e.target.value);
                  setError("");
                }}
              >
                <option value="">Select an asset…</option>
                {assets.map((asset) => (
                  <option key={asset.assetId} value={asset.assetId}>
                    {asset.laptopName} · {asset.brand} · {asset.serialNumber}
                  </option>
                ))}
              </select>
            )}

            {error && (
              <div style={{ fontSize: 12.5, color: "var(--danger)", marginTop: 4 }}>
                ⚠ {error}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={assigning}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={assignAsset}
            disabled={assigning || loading || assets.length === 0}
          >
            {assigning ? "Assigning…" : "Assign Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}
