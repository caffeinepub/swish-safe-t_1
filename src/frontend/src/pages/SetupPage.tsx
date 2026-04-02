import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function SetupPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}
