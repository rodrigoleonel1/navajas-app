import { Navigate } from "react-router-dom";
import { getRole } from "../lib/auth";

export function RoleRedirect() {
  const role = getRole();
  if (role === "admin") return <Navigate to="/app/admin" replace />;
  if (role === "barber") return <Navigate to="/app/barber" replace />;
  if (role === "client") return <Navigate to="/app/client" replace />;
  return <Navigate to="/login" replace />;
}
