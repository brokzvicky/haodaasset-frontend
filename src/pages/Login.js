import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [tab, setTab]           = useState("admin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(identifier.trim(), password, tab);

    if (result.success) {
      if (result.role === "admin") {
        navigate("/dashboard");
      } else if (result.mustChangePassword) {
        navigate("/emp/password", { state: { forced: true } });
      } else {
        navigate("/emp/dashboard");
      }
    } else {
      setError(result.message || "Invalid credentials. Please try again.");
    }

    setLoading(false);
  };

  const switchTab = (t) => {
    setTab(t);
    setIdentifier("");
    setPassword("");
    setError("");
  };

  return (
    <div className="login-page">
      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div className="login-left">
        {/* Dot grid */}
        <div className="login-left-grid" />

        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">AT</div>
          <div>
            <div className="login-brand-name">AssetTower</div>
            <div className="login-brand-sub">Enterprise IT Asset Management</div>
          </div>
        </div>

        {/* Hero */}
        <div className="login-hero">
          <div className="login-hero-tag">
            <span className="login-hero-tag-dot" />
            Trusted by 500+ IT teams
          </div>
          <h1 className="login-hero-title">
            Manage every<br />
            <span>IT asset</span><br />
            effortlessly.
          </h1>
          <p className="login-hero-desc">
            One platform to track, assign, and audit your organization's hardware
            and software assets across every department and location.
          </p>
        </div>

        {/* Stats */}
        <div className="login-stats">
          <div>
            <div className="login-stat-value">99.9%</div>
            <div className="login-stat-label">Uptime SLA</div>
          </div>
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: 24 }}>
            <div className="login-stat-value">50k+</div>
            <div className="login-stat-label">Assets Tracked</div>
          </div>
          <div style={{ borderLeft: "1px solid rgba(255,255,255,0.1)", paddingLeft: 24 }}>
            <div className="login-stat-value">ISO</div>
            <div className="login-stat-label">27001 Certified</div>
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div className="login-right">
        <div className="login-box fade-in">
          <div className="login-box-header">
            <div className="login-box-title">Welcome back</div>
            <div className="login-box-sub">Sign in to your AssetTower account</div>
          </div>

          {/* Role tabs */}
          <div className="login-tabs">
            <button
              className={`login-tab ${tab === "admin" ? "active" : ""}`}
              onClick={() => switchTab("admin")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Admin
            </button>
            <button
              className={`login-tab ${tab === "employee" ? "active" : ""}`}
              onClick={() => switchTab("employee")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              Employee
            </button>
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            {tab === "admin" ? (
              <>
                <div className="login-field">
                  <label className="login-label">Username</label>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="Enter username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="login-field">
                  <label className="login-label">Password</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div className="login-field">
                  <label className="login-label">Employee ID</label>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="e.g. EMP001"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="login-field">
                  <label className="login-label">Password</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {error && (
              <div className="login-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Signing in…" : `Sign in as ${tab === "admin" ? "Admin" : "Employee"}`}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--gray-400)", marginTop: 20 }}>
            Protected by enterprise-grade security · v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
