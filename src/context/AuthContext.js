import React, { createContext, useContext, useState } from "react";
import axios from "axios";

const AuthContext = createContext(null);

const API = "http://localhost:8080";

const STORAGE_KEY = "iam_user";
const TOKEN_KEY = "iam_token";

function loadUser() {
  const saved = sessionStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);

  const persist = (userObj, token) => {
    setUser(userObj);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userObj));
    sessionStorage.setItem(TOKEN_KEY, token);
    // Attach the token to every future axios call automatically.
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  };

  /**
   * identifier = admin username OR employee ID, depending on which tab the
   * Login page is on. We try the role implied by isAdminTab first; if that
   * 401s we don't fall through (avoids leaking which role a credential pair
   * is valid for) — the caller (Login.js) controls which endpoint to hit
   * via the `role` argument.
   */
  const login = async (identifier, password, role) => {
    try {
      if (role === "admin") {
        const { data } = await axios.post(`${API}/api/auth/admin/login`, {
          username: identifier,
          password,
        });
        const adminUser = { role: "admin", name: data.name, id: "ADMIN" };
        persist(adminUser, data.token);
        return { success: true, role: "admin" };
      } else {
        const { data } = await axios.post(`${API}/api/auth/employee/login`, {
          employeeId: identifier,
          password,
        });
        const empUser = {
          role: "employee",
          id: data.employeeId,
          name: data.name,
          email: data.email,
          dept: data.department,
          roleTitle: data.designation,
          location: data.location,
          mustChangePassword: data.mustChangePassword,
        };
        persist(empUser, data.token);
        return {
          success: true,
          role: "employee",
          mustChangePassword: data.mustChangePassword,
        };
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Invalid credentials. Please check and try again.";
      return { success: false, message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!user || user.role !== "employee") {
      return { success: false, message: "Not logged in as an employee." };
    }
    try {
      await axios.post(`${API}/api/auth/employee/change-password`, {
        employeeId: user.id,
        currentPassword,
        newPassword,
      });
      const updated = { ...user, mustChangePassword: false };
      setUser(updated);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return { success: true };
    } catch (err) {
      const message =
        err.response?.data?.message || "Could not change password.";
      return { success: false, message };
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    delete axios.defaults.headers.common["Authorization"];
  };

  // Re-attach the bearer token on a hard refresh, since axios defaults
  // reset but sessionStorage persists.
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token && !axios.defaults.headers.common["Authorization"]) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
