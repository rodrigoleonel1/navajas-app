import { ZodError } from "zod";

// Valida req.query con un schema Zod (ej: filtros ?barberId&date&status).
// Express 5 expone req.query como getter: no se puede reasignar,
// por eso se copian las claves validadas una por una (igual que sanitize.js).
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req.query);
      for (const key of Object.keys(req.query)) {
        delete req.query[key];
      }
      for (const [key, value] of Object.entries(parsed)) {
        req.query[key] = value;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.issues[0]?.message || "Datos inválidos";
        res.status(400).json({
          error: { code: "VALIDATION_ERROR", message },
        });
        return;
      }
      next(err);
    }
  };
}
