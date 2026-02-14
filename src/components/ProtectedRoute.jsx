
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ user, allowedRoles, children }) {
  // Jika tidak login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Jika login tapi role tidak sesuai
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/portal" replace />;
  }

  return children;
}