import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:8080";

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

  useEffect(() => {
    if (!open) return;

    setLoading(true);

    axios
      .get(`${API}/assets/available`)
      .then((res) => {
        setAssets(res.data);
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to load available assets.");
      })
      .finally(() => setLoading(false));
  }, [open]);

  if (!open || !request) return null;

  const assignAsset = async () => {
    if (!selectedAsset) {
      alert("Please select an asset.");
      return;
    }

    setAssigning(true);

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
      alert(
        err.response?.data?.message ||
          "Unable to assign asset."
      );
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: 520,
          background: "#fff",
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          Assign Asset
        </h2>

        <hr />

        <p>
          <strong>Employee</strong>
        </p>

        <p>{request.employeeName}</p>

        <p>{request.employeeId}</p>

        <p>
          Requested Asset:
          <strong> {request.assetType}</strong>
        </p>

        <br />

        {loading ? (
          <p>Loading available assets...</p>
        ) : (
          <select
            style={{
              width: "100%",
              height: 42,
            }}
            value={selectedAsset}
            onChange={(e) =>
              setSelectedAsset(e.target.value)
            }
          >
            <option value="">
              Select Available Asset
            </option>

            {assets.map((asset) => (
              <option
                key={asset.assetId}
                value={asset.assetId}
              >
                {asset.laptopName} | {asset.serialNumber}
              </option>
            ))}
          </select>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 25,
          }}
        >
          <button onClick={onClose}>
            Cancel
          </button>

          <button
            onClick={assignAsset}
            disabled={assigning}
          >
            {assigning
              ? "Assigning..."
              : "Assign Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}