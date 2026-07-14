import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, RefreshCw, ArrowLeft, AlertTriangle, Boxes, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import "../components/ForgotPasswordModal.css";

export default function Login() {
  const { login, verifyAdminOtp, resendAdminOtp } = useAuth();
  const navigate   = useNavigate();

  const [tab, setTab]           = useState("admin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // ── Admin 2FA step ─────────────────────────────────────────────────
  const [stage, setStage] = useState("credentials"); // "credentials" | "2fa"
  const [challengeToken, setChallengeToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(300);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (stage !== "2fa") return;
    const t = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
      setOtpExpirySeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [stage]);

  const handleOtpChange = (idx, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };
  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setOtp(text.split("").concat(Array(6).fill("")).slice(0, 6));
    otpRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const backToCredentials = () => {
    setStage("credentials");
    setChallengeToken("");
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    const result = await verifyAdminOtp(challengeToken, code);
    setLoading(false);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.message);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    const result = await resendAdminOtp(challengeToken);
    setLoading(false);
    if (result.success) {
      setResendCooldown(result.resendAfterSeconds ?? 30);
      setOtpExpirySeconds(result.expiresInSeconds ?? 300);
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } else {
      setError(result.message);
    }
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(identifier.trim(), password, tab);
    setLoading(false);

    if (!result.success) {
      setError(result.message || "Invalid credentials. Please try again.");
      return;
    }

    if (result.role === "admin") {
      if (result.twoFactorRequired) {
        setChallengeToken(result.challengeToken);
        setMaskedEmail(result.maskedEmail);
        setResendCooldown(result.resendAfterSeconds ?? 30);
        setOtpExpirySeconds(result.expiresInSeconds ?? 300);
        setOtp(["", "", "", "", "", ""]);
        setStage("2fa");
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
      } else {
        navigate("/dashboard");
      }
    } else if (result.mustChangePassword) {
      navigate("/emp/password", { state: { forced: true } });
    } else {
      navigate("/emp/dashboard");
    }
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
          <div className="login-brand-icon">
            <img src="/haoda-icon.png" alt="Haoda Group" />
          </div>
          <div>
            <div className="login-brand-name">Haoda Asset</div>
            <div className="login-brand-sub">IT Asset Management · Haoda Group</div>
          </div>
        </div>

        {/* Hero */}
        <div className="login-hero">
          <div className="login-hero-tag">
            <span className="login-hero-tag-dot" />
            Internal IT Operations Platform
          </div>
          <h1 className="login-hero-title">
            Manage every<br />
            <span>IT asset</span><br />
            effortlessly.
          </h1>
          <p className="login-hero-desc">
            One platform to track, assign, and audit Haoda Group's hardware
            and software assets across every department and location.
          </p>
        </div>

        {/* What the platform actually does — real features, not stats */}
        <div className="login-features">
          <div className="login-feature">
            <div className="login-feature-icon"><Boxes size={16} /></div>
            <div className="login-feature-text">Centralized asset tracking, end to end</div>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon"><ShieldCheck size={16} /></div>
            <div className="login-feature-text">Two-factor secured admin access</div>
          </div>
          <div className="login-feature">
            <div className="login-feature-icon"><KeyRound size={16} /></div>
            <div className="login-feature-text">Role-based access for admins &amp; employees</div>
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div className="login-right">
        <div className="login-box fade-in">
          <div className="login-box-header">
            <div className="login-box-title">{stage === "2fa" ? "Verify it's you" : "Welcome back"}</div>
            <div className="login-box-sub">
              {stage === "2fa"
                ? `Enter the 6-digit code sent to ${maskedEmail}`
                : "Sign in to your Haoda Asset account"}
            </div>
          </div>

          {stage === "credentials" && (
            <>
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
                      <button
                        type="button"
                        className="login-forgot-link"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot Password?
                      </button>
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

              {tab === "admin" && (
                <div style={{
                  marginTop: 16, display: "flex", alignItems: "center", gap: 6,
                  fontSize: 11.5, color: "var(--gray-400)", justifyContent: "center",
                }}>
                  <ShieldCheck size={13} /> Protected by two-factor email verification
                </div>
              )}
            </>
          )}

          {stage === "2fa" && (
            <form className="login-form" onSubmit={handleVerifyOtp}>
              {error && (
                <div className="fpwd-error" style={{ marginBottom: 4 }}>
                  <AlertTriangle size={14} /> {error}
                </div>
              )}

              <div className="fpwd-otp-row" onPaste={handleOtpPaste}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    className="fpwd-otp-box"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  />
                ))}
              </div>

              <div className="fpwd-meta-row">
                <span className={`fpwd-expiry ${otpExpirySeconds <= 30 ? "is-low" : ""}`}>
                  Code expires in {fmtTime(Math.max(otpExpirySeconds, 0))}
                </span>
                <button
                  type="button"
                  className="fpwd-link-btn"
                  disabled={resendCooldown > 0 || loading}
                  onClick={handleResendOtp}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>

              <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: 14 }}>
                {loading ? <><RefreshCw size={15} className="fpwd-spin" style={{ marginRight: 6 }} /> Verifying…</> : "Verify & Sign In"}
              </button>

              <button type="button" className="fpwd-back-btn" onClick={backToCredentials} style={{ margin: "12px auto 0" }}>
                <ArrowLeft size={13} /> Back to sign in
              </button>
            </form>
          )}

          <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--gray-400)", marginTop: 20 }}>
            Protected by enterprise-grade security · v2.0
          </p>
        </div>
      </div>

      {showForgotPassword && (
        <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />
      )}
    </div>
  );
}
