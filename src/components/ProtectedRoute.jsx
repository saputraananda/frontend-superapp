import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ user, allowedRoles, maintenance = false, children }) {
  // Belum login
  if (!user) return <Navigate to="/login" replace />;

  // Halaman maintenance
  if (maintenance) return <Navigate to="/maintenance" replace />;

  // Cek role
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(user.role);
    if (!hasRole) return <Navigate to="/portal" replace />;
  }

  return children;
}