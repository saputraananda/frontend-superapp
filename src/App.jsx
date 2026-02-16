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
import LoadingScreen from "./components/LoadingScreen";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appRoles, setAppRoles] = useState({});
  const [authChecked, setAuthChecked] = useState(false);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  useEffect(() => {
    // Cek session dari backend
    const checkAuth = async () => {
      try {
        const d = await api("/auth/me");
        setUser(d.user);
        localStorage.setItem("user", JSON.stringify(d.user));
      } catch {
        setUser(null);
        localStorage.removeItem("user");
      } finally {
        setAuthChecked(true);
      }
    };

    // Fetch mapping path -> allowedRoles dari backend
    const loadRoles = async () => {
      try {
        const data = await api("/apps/authorization");
        const mapping = {};
        data.forEach((app) => {
          mapping[app.path] = app.authorization
            ? app.authorization.split(",").map((r) => r.trim())
            : [];
        });
        setAppRoles(mapping);
      } catch {
        setAppRoles({});
      } finally {
        setRolesLoaded(true);
      }
    };

    checkAuth();
    loadRoles();
  }, []);

  // Set loading false hanya ketika auth dan roles sudah dicek
  useEffect(() => {
    if (authChecked && rolesLoaded) {
      setLoading(false);
    }
  }, [authChecked, rolesLoaded]);

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
    return <LoadingScreen type="full" />;
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
          path="/projectmanagement/*"
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