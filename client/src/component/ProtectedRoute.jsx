
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) return <p className="center">Loading...</p>;

  if (!user) return <Navigate to="/login" replace />;

  if (!role) {
    return (
      <main className="center">
        <h2>Account role not configured</h2>
        <p>Contact your administrator.</p>
      </main>
    );
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
