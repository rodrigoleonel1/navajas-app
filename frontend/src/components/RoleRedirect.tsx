import { Navigate } from "react-router-dom";
import { getRole } from "../lib/auth";

// /app/agenda despacha por rol; sin sesión, al login.
export function RoleRedirect() {
  if (!getRole()) return <Navigate to="/login" replace />;
  return <Navigate to="/app/agenda" replace />;
}
