import { ZodError } from "zod";

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
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

export default validateBody;
