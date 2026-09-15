import mongoSanitize from "express-mongo-sanitize";

// Sanitiza body, params y query contra inyección NoSQL ($gt, $ne, etc.)
// Express 5 tiene req.query como getter, por eso se reasigna por clave en lugar de req.query = sanitized
export function sanitizeInputs(req, _res, next) {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  if (req.query) {
    const sanitized = mongoSanitize.sanitize({ ...req.query });
    for (const key of Object.keys(sanitized)) {
      // @ts-ignore - Express 5 query es getter
      req.query[key] = sanitized[key];
    }
    for (const key of Object.keys(req.query)) {
      if (!(key in sanitized)) {
        // @ts-ignore
        delete req.query[key];
      }
    }
  }
  next();
}
