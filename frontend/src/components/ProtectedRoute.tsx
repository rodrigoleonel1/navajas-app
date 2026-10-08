import { Navigate } from "react-router-dom";
import { clearAuth, getUser } from "../lib/auth";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" && Date.now() / 1000 > payload.exp;
  } catch {
    return false;
  }
}

export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const token = localStorage.getItem("token");
  if (!token || isTokenExpired(token)) {
    if (token) clearAuth();
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(getUser()?.role ?? "")) {
    return <Navigate to="/app" replace />;
  }
  return children;
}
