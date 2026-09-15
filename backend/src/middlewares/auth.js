import jwt from "jsonwebtoken";
import { config } from "../config.js";

// Verifica JWT con esquema Bearer y guarda payload en req.user
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Autenticación requerida" },
    });
    return;
  }

  const token = header.slice(7); // quita "Bearer "
  try {
    req.user = jwt.verify(token, config.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Sesión expirada o no válida." },
    });
  }
}

// Autoriza solo a ciertos roles (usar después de authenticate)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Autenticación requerida" },
      });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: { code: "FORBIDDEN", message: "Permisos insuficientes" },
      });
      return;
    }
    next();
  };
}
