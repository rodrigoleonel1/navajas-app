import { ZodError } from "zod";

// Valida req.query con un schema Zod (ej: filtros ?barberId&date&status).
// Express 5 expone req.query como getter que re-parsea en cada acceso:
// NO se puede escribir ahí (los cambios se pierden), por eso lo validado
// (con coerciones y defaults aplicados) se expone en req.validatedQuery.
export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.validatedQuery = schema.parse(req.query);
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
