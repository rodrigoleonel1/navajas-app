// errorHandler: atrapa cualquier error lanzado con next(err) en controllers/services.
// Formato uniforme {error:{code,message}} para que el frontend siempre sepa qué mostrar.
// - Si el error tiene statusCode/code (ej: err.statusCode=400, err.code="VALIDATION_ERROR") los usa
// - Si no, asume 500 INTERNAL_ERROR
// - Solo loguea en consola si es 500 (error del servidor), no si es 400/401 de validación
export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode ?? 500;
  const code = err.code ?? "INTERNAL_ERROR";
  const message = err.message || "Error interno del servidor";

  if (status >= 500) {
    console.error("[error]", err);
  }

  res.status(status).json({
    error: {
      code,
      message,
    },
  });
}

// notFound: se ejecuta cuando ninguna ruta de app.js hizo match (ej: GET /api/inexistente).
// Debe ir antes de errorHandler en app.js: app.use(notFound); app.use(errorHandler);
// Responde 404 con formato uniforme.
export function notFound(_req, res) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Recurso no encontrado",
    },
  });
}
