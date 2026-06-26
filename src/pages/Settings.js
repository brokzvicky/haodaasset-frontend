import React, { useState } from "react";
import Layout from "../components/Layout";
import { useToast } from "../utils/Toast";

export default function Settings() {
  const toast = useToast();
  const [orgName, setOrgName] = useState("Haoda Tech Solutions");
  const [apiUrl, setApiUrl] = useState("http://localhost:8080");
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });

  const saveOrg = () => {
    if (!orgName.trim()) { toast("Organization name can't be empty.", "error"); return; }
    toast("Preferences saved for this session.", "success");
  };

  const updatePassword = () => {
    if (!pwd.current || !pwd.next || !pwd.confirm) { toast("All password fields are required.", "error"); return; }
    if (pwd.next.length < 8) { toast("New password must be at least 8 characters.", "error"); return; }
    if (pwd.next !== pwd.confirm) { toast("New passwords do not match.", "error"); return; }
    toast("Admin password changes aren't wired up yet — check back soon.", "info");
  };

  return (
    <Layout title="Settings" subtitle="System configuration and preferences">
      <div style={{ maxWidth: 680, display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Organization</div>
              <div className="card-subtitle">Display preferences for this session</div>
            </div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="field">
              <label className="field-label">Organization Name</label>
              <input className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">API Endpoint</label>
              <input className="input" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} disabled style={{ background: "var(--gray-50)", color: "var(--gray-500)", cursor: "not-allowed" }} />
              <div style={{ fontSize: 11.5, color: "var(--gray-400)", marginTop: 4 }}>
                Set via build configuration — not editable here.
              </div>
            </div>
            <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={saveOrg}>
              Save Changes
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Security</div>
              <div className="card-subtitle">Administrator account password</div>
            </div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="field">
              <label className="field-label">Current Password</label>
              <input className="input" type="password" placeholder="••••••••" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} />
            </div>
            <div className="field">
              <label className="field-label">New Password</label>
              <input className="input" type="password" placeholder="Minimum 8 characters" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} />
            </div>
            <div className="field">
              <label className="field-label">Confirm New Password</label>
              <input className="input" type="password" placeholder="••••••••" value={pwd.confirm} onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))} />
            </div>
            <button className="btn btn-primary" style={{ alignSelf: "flex-start" }} onClick={updatePassword}>
              Update Password
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
