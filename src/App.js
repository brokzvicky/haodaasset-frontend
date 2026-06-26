import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./utils/Toast";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { AdminRoute, EmployeeRoute, GuestRoute } from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import Employees from "./pages/Employees";
import AdminAssetRequests from "./pages/AdminAssetRequests";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import { EmployeeAssets, EmployeeProfile, EmployeeRequest, EmployeePassword } from "./pages/EmployeePages";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              {/* Guest */}
              <Route path="/" element={<GuestRoute><Login /></GuestRoute>} />

              {/* Admin Routes */}
              <Route path="/dashboard"     element={<AdminRoute><Dashboard /></AdminRoute>} />
              <Route path="/assets"        element={<AdminRoute><Assets /></AdminRoute>} />
              <Route path="/employees"     element={<AdminRoute><Employees /></AdminRoute>} />
              <Route path="/asset-requests" element={<AdminRoute><AdminAssetRequests /></AdminRoute>} />
              <Route path="/reports"       element={<AdminRoute><Reports /></AdminRoute>} />
              <Route path="/settings"      element={<AdminRoute><Settings /></AdminRoute>} />

              {/* Employee Routes */}
              <Route path="/emp/dashboard" element={<EmployeeRoute><EmployeeDashboard /></EmployeeRoute>} />
              <Route path="/emp/assets"    element={<EmployeeRoute><EmployeeAssets /></EmployeeRoute>} />
              <Route path="/emp/profile"   element={<EmployeeRoute><EmployeeProfile /></EmployeeRoute>} />
              <Route path="/emp/request"   element={<EmployeeRoute><EmployeeRequest /></EmployeeRoute>} />
              <Route path="/emp/password"  element={<EmployeeRoute><EmployeePassword /></EmployeeRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
