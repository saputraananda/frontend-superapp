import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import Register from "./pages/Register";
import Portal from "./pages/portal";

export default function App() {
  // Inisialisasi user langsung dari localStorage
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Fungsi login
  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // Fungsi logout
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

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
            user ? <Portal user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
          }
        />
        <Route
          path="*"
          element={<Navigate to={user ? "/portal" : "/login"} />}
        />
      </Routes>
    </BrowserRouter>
  );
}