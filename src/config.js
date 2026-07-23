// Centralized environment configuration.
//
// API_BASE previously lived as a hardcoded literal
// ("https://haodaasset-backend-1.onrender.com") copy-pasted into 29+ files
// across the app — meaning every environment (local dev, staging, a future
// white-label deployment) required manually editing every one of those
// files. This is now the single source of truth: set REACT_APP_API_URL in
// your environment (e.g. .env.local for local dev pointing at
// http://localhost:8080) and every page picks it up automatically. The
// literal below is kept only as the fallback for existing deployments that
// haven't set the env var yet, so nothing breaks on first upgrade.
export const API_BASE =
  process.env.REACT_APP_API_URL || "https://haodaasset-backend-1.onrender.com";

// OAuth 2.0 Web Client ID from Google Cloud Console (Credentials -> OAuth
// client ID -> Web application). Must match app.google.client-id on the
// backend — GoogleTokenVerifier rejects any token whose audience doesn't
// equal that same value. Required for the "Continue with Google" button;
// left unset, that button is hidden rather than shown broken.
export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
