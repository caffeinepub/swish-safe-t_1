import type React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { AppUser } from "../types";

interface RoleGuardProps {
  children: React.ReactNode;
  roles?: AppUser["role"][];
  redirectTo?: string;
}

export function RoleGuard({
  children,
  roles,
  redirectTo = "/login",
}: RoleGuardProps) {
  const { user, hasRole } = useAuth();

  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (roles && roles.length > 0 && !hasRole(...roles)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
