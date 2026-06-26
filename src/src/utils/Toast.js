import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const icons = { success: "✓", error: "✕", warning: "!", info: "i" };
  const colors = {
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
        {toasts.map((t) => (
          <div key={t.id} role="status" aria-live="polite" style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "#fff", border: `1px solid ${colors[t.type]}30`,
            borderLeft: `4px solid ${colors[t.type]}`,
            borderRadius: 10, padding: "12px 16px", minWidth: 280,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            animation: "slideIn 0.25s ease",
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: "50%",
              background: colors[t.type], color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>{icons[t.type]}</span>
            <span style={{ fontSize: 13.5, color: "#1e293b", fontWeight: 500 }}>{t.message}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

