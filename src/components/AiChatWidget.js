import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Sparkles, X, Send, Laptop, MapPin, User, Wrench, Trophy, ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./AiChatWidget.css";

const API = "https://haodaasset-backend-1.onrender.com";

const ADMIN_STARTERS = [
  "Which employee has the most assets?",
  "Which warranties expire this month?",
  "Show unassigned laptops",
  "Which assets are due for maintenance?",
];

const EMPLOYEE_STARTERS = [
  "Show my assets",
  "Where is my laptop?",
  "Is my warranty active?",
];

function AssetCard({ asset }) {
  return (
    <div className="ai-chat-card">
      <div className="ai-chat-card-icon"><Laptop size={14} /></div>
      <div className="ai-chat-card-body">
        <div className="ai-chat-card-title">{asset.laptopName}</div>
        <div className="ai-chat-card-sub">{asset.brand} {asset.model || ""}</div>
        <div className="ai-chat-card-meta">
          {asset.location && <span><MapPin size={11} /> {asset.location}</span>}
          {asset.employeeName && <span><User size={11} /> {asset.employeeName}</span>}
        </div>
      </div>
      <span className={`ai-chat-status-dot status-${(asset.assetStatus || "").toLowerCase()}`} />
    </div>
  );
}

function EmployeeStatRow({ stat, rank }) {
  return (
    <div className="ai-chat-emp-row">
      <div className="ai-chat-emp-rank">{rank === 0 ? <Trophy size={13} /> : rank + 1}</div>
      <div className="ai-chat-emp-body">
        <div className="ai-chat-card-title">{stat.employeeName}</div>
        <div className="ai-chat-card-sub">{stat.employeeId}</div>
      </div>
      <div className="ai-chat-emp-count">{stat.assetCount}</div>
    </div>
  );
}

function MaintenanceRow({ record }) {
  return (
    <div className="ai-chat-card">
      <div className="ai-chat-card-icon"><Wrench size={14} /></div>
      <div className="ai-chat-card-body">
        <div className="ai-chat-card-title">{record.maintenanceType || "Maintenance"}</div>
        <div className="ai-chat-card-sub">Asset #{record.assetId}</div>
        <div className="ai-chat-card-meta">
          <span>Due {record.nextMaintenanceDate || record.scheduledDate || "soon"}</span>
        </div>
      </div>
    </div>
  );
}

export default function AiChatWidget() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const send = useCallback(async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);

    try {
      const { data } = await axios.post(`${API}/api/ai/chat`, { message: text });
      setMessages((m) => [...m, { role: "assistant", data }]);
    } catch (err) {
      setMessages((m) => [...m, {
        role: "assistant",
        data: { answer: err?.response?.data?.message || "Something went wrong reaching the assistant. Please try again." },
      }]);
    } finally {
      setSending(false);
    }
  }, [input, sending]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const starters = isAdmin ? ADMIN_STARTERS : EMPLOYEE_STARTERS;

  return (
    <>
      <button
        className={`ai-chat-fab ${open ? "ai-chat-fab-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
        title="Ask Haoda AI"
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {open && (
        <div className="ai-chat-panel" role="dialog" aria-label="AI Asset Assistant">
          <div className="ai-chat-header">
            <div className="ai-chat-header-icon"><Sparkles size={16} /></div>
            <div>
              <div className="ai-chat-header-title">Haoda AI Assistant</div>
              <div className="ai-chat-header-sub">Ask about assets, employees, warranties &amp; maintenance</div>
            </div>
          </div>

          <div className="ai-chat-body" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="ai-chat-empty">
                <div className="ai-chat-empty-icon"><Sparkles size={22} /></div>
                <div className="ai-chat-empty-title">Hi {user?.name?.split(" ")[0] || "there"}, ask me anything.</div>
                <div className="ai-chat-starters">
                  {starters.map((s) => (
                    <button key={s} className="ai-chat-starter-chip" onClick={() => send(s)}>
                      {s} <ChevronRight size={12} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`ai-chat-msg ai-chat-msg-${m.role}`}>
                {m.role === "user" ? (
                  <div className="ai-chat-bubble ai-chat-bubble-user">{m.text}</div>
                ) : (
                  <div className="ai-chat-bubble ai-chat-bubble-assistant">
                    <div className="ai-chat-answer">{m.data.answer}</div>

                    {m.data.type === "ASSETS" && m.data.assets?.length > 0 && (
                      <div className="ai-chat-card-list">
                        {m.data.assets.slice(0, 6).map((a) => <AssetCard key={a.assetId} asset={a} />)}
                      </div>
                    )}

                    {m.data.type === "EMPLOYEES" && m.data.employees?.length > 0 && (
                      <div className="ai-chat-card-list">
                        {m.data.employees.map((s, idx) => <EmployeeStatRow key={s.employeeId} stat={s} rank={idx} />)}
                      </div>
                    )}

                    {m.data.type === "MAINTENANCE" && m.data.maintenanceRecords?.length > 0 && (
                      <div className="ai-chat-card-list">
                        {m.data.maintenanceRecords.slice(0, 6).map((r) => <MaintenanceRow key={r.id} record={r} />)}
                      </div>
                    )}

                    {m.data.suggestions?.length > 0 && (
                      <div className="ai-chat-suggest-row">
                        {m.data.suggestions.map((s) => (
                          <button key={s} className="ai-chat-starter-chip ai-chat-starter-chip-sm" onClick={() => send(s)}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="ai-chat-msg ai-chat-msg-assistant">
                <div className="ai-chat-bubble ai-chat-bubble-assistant ai-chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          <div className="ai-chat-input-row">
            <input
              ref={inputRef}
              className="ai-chat-input"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button className="ai-chat-send-btn" onClick={() => send()} disabled={!input.trim() || sending} aria-label="Send">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
