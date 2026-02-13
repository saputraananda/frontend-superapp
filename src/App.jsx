import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api } from "./lib/api";
import Login from "./pages/auth/login";
import Register from "./pages/auth/register";
import Portal from "./pages/portal";
import Profile from "./pages/profile";
import Dashboard from "./pages/dashboard";


export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
            user ? (
              <Portal user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/profile"
          element={
            user ? <Profile /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/dashboard"
          element={
            user ? <Dashboard /> : <Navigate to="/login" />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}