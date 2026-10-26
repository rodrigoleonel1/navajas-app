import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { createAppError } from "../utils/appError.js";

// Mensajes únicos para que todas las respuestas de auth sean consistentes.
const MSG_AUTH_REQUIRED = "Autenticación requerida.";
const MSG_INVALID_SESSION = "Sesión expirada o no válida.";
const MSG_FORBIDDEN = "Permisos insuficientes.";

// Verifica JWT con esquema Bearer y guarda payload en req.user
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(createAppError(401, "UNAUTHORIZED", MSG_AUTH_REQUIRED));
    return;
  }

  const token = header.slice(7); // quita "Bearer "
  try {
    req.user = jwt.verify(token, config.JWT_SECRET);
    next();
  } catch {
    next(createAppError(401, "UNAUTHORIZED", MSG_INVALID_SESSION));
  }
}

// Auth opcional: si hay Bearer lo verifica y guarda payload en req.user;
// sin header sigue sin usuario (ruta pública). Token inválido → 401.
export function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header) {
    next();
    return;
  }
  if (!header.startsWith("Bearer ")) {
    next(createAppError(401, "UNAUTHORIZED", MSG_AUTH_REQUIRED));
    return;
  }

  const token = header.slice(7); // quita "Bearer "
  try {
    req.user = jwt.verify(token, config.JWT_SECRET);
    next();
  } catch {
    next(createAppError(401, "UNAUTHORIZED", MSG_INVALID_SESSION));
  }
}

// Autoriza solo a ciertos roles (usar después de authenticate)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      next(createAppError(401, "UNAUTHORIZED", MSG_AUTH_REQUIRED));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(createAppError(403, "FORBIDDEN", MSG_FORBIDDEN));
      return;
    }
    next();
  };
}
