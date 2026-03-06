import { Navigate } from "react-router-dom";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("admin_token");
  if (!token) {
    return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}
