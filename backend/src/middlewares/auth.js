import jwt from "jsonwebtoken";
import { config } from "../config.js";

// authenticate: verifica que el cliente envió un JWT válido.
// Flujo: 1) lee header Authorization: "Bearer <token>"
//        2) si no hay header -> 401 UNAUTHORIZED
//        3) verifica firma con JWT_SECRET (config.jwtSecret)
//        4) si es válido, guarda payload (id, role, email) en req.user y sigue con next()
//        5) si es inválido/expirado -> 401
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Token no proporcionado" },
    });
    return;
  }

  const token = header.slice(7); // quita "Bearer "
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload; // disponible en controllers/services como req.user.id / req.user.role
    next();
  } catch {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Token inválido o expirado" },
    });
  }
}

// requireRole: autoriza solo a ciertos roles.
// Uso: app.post("/api/appointments/:id/cancel", authenticate, requireRole("client","admin"), controller)
//      - si no pasó por authenticate -> req.user undefined -> 401
//      - si role no está en la lista -> 403 FORBIDDEN
//      - si sí está -> next() y el controller se ejecuta
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "No autenticado" },
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
