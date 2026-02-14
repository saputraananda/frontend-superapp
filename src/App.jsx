import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api } from "./lib/api";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Portal from "./pages/Portal";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import ProjectManagement from "./pages/ProjectManagement";
import EmployeeSatisfaction from "./pages/EmployeeSatisfaction";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appRoles, setAppRoles] = useState({});

  useEffect(() => {
    // Cek session dari backend
    api("/auth/me")
      .then((d) => {
        setUser(d.user);
        localStorage.setItem("user", JSON.stringify(d.user));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem("user");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Fetch mapping path -> allowedRoles dari backend
    api("/apps/authorization")
      .then((data) => {
        // data: [{ path: "/dashboard", authorization: "admin,manager,spv_bdsm" }, ...]
        const mapping = {};
        data.forEach((app) => {
          mapping[app.path] = app.authorization
            ? app.authorization.split(",").map((r) => r.trim())
            : [];
        });
        setAppRoles(mapping);
      })
      .catch(() => setAppRoles({}));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setUser(null);
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-100 via-pink-100 to-sky-100">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            user ? <Navigate to="/portal" /> : <Login onLogin={handleLogin} />
          }
        />
        <Route
          path="/register"
          element={
            user ? <Navigate to="/portal" /> : <Register />
          }
        />
        <Route
          path="/portal"
          element={
            <ProtectedRoute user={user}>
              <Portal user={user} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute user={user}>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Dinamis allowedRoles */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/dashboard"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projectmanagement"
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/projectmanagement"]}>
              <ProjectManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employeesatisfaction"
          element={
            <ProtectedRoute user={user} allowedRoles={appRoles["/employeesatisfaction"]}>
              <EmployeeSatisfaction />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={<Navigate to={user ? "/portal" : "/login"} />}
        />

        <Route
          path="*"
          element={<Navigate to={user ? "/portal" : "/login"} />}
        />
      </Routes>
    </BrowserRouter>
  );
}