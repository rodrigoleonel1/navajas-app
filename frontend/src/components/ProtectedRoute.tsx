import { Navigate } from "react-router-dom";
import { clearAuth } from "../lib/auth";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" && Date.now() / 1000 > payload.exp;
  } catch {
    return false;
  }
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token");
  if (!token || isTokenExpired(token)) {
    if (token) clearAuth();
    return <Navigate to="/login" replace />;
  }
  return children;
}
