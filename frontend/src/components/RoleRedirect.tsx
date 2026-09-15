import { Navigate } from "react-router-dom";

function getRole(): string | null {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.role || null;
  } catch {
    return null;
  }
}

export function RoleRedirect() {
  const role = getRole();
  if (role === "admin") return <Navigate to="/app/admin" replace />;
  if (role === "barber") return <Navigate to="/app/barber" replace />;
  if (role === "client") return <Navigate to="/app/client" replace />;
  return <Navigate to="/login" replace />;
}
