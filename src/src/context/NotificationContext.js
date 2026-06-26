import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const API = "https://haodaasset-backend-1.onrender.com";
const POLL_MS = 15_000; // poll every 15 s
const SEEN_KEY = "iam_seen_requests"; // localStorage key for read IDs

function loadSeen() {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY)) || []); }
  catch { return new Set(); }
}
function saveSeen(set) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...set]));
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [notifications, setNotifications] = useState([]); // all requests as notifications
  const [unread, setUnread]               = useState(0);
  const [open, setOpen]                   = useState(false);
  const seenRef                           = useRef(loadSeen());
  const timerRef                          = useRef(null);

  const buildNotifications = useCallback((requests) => {
    return requests
      .filter((r) => r.status === "PENDING")         // only pending ones are "notifications"
      .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        employeeId:   r.employeeId,
        employeeName: r.employeeName,
        assetType:    r.assetType,
        urgency:      r.urgency,
        requestedAt:  r.requestedAt,
        read: seenRef.current.has(String(r.id)),
      }));
  }, []);

  const fetchRequests = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await axios.get(`${API}/api/admin/requests`);
      const notifs = buildNotifications(data);
      setNotifications(notifs);
      setUnread(notifs.filter((n) => !n.read).length);
    } catch {
      // silent — toast errors only on explicit user actions
    }
  }, [isAdmin, buildNotifications]);

  // Start polling when admin is logged in
  useEffect(() => {
    if (!isAdmin) { setNotifications([]); setUnread(0); return; }
    fetchRequests();
    timerRef.current = setInterval(fetchRequests, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [isAdmin, fetchRequests]);

  // Open / close the dropdown; mark all as read on open
  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        // opening — mark everything currently in list as read
        setNotifications((ns) => ns.map((n) => { seenRef.current.add(String(n.id)); return { ...n, read: true }; }));
        saveSeen(seenRef.current);
        setUnread(0);
      }
      return !prev;
    });
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // Called after approve/reject so list stays fresh
  const refresh = useCallback(() => fetchRequests(), [fetchRequests]);

  return (
    <NotificationContext.Provider value={{ notifications, unread, open, toggleOpen, close, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);

