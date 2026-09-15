// errorHandler: atrapa cualquier error lanzado con next(err) en controllers/services.
// Formato uniforme {error:{code,message}} para que el frontend siempre sepa qué mostrar.
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

// notFound: se ejecuta cuando ninguna ruta de app.js hizo match (ej: GET /api/inexistente)
export function notFound(_req, res) {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Recurso no encontrado",
    },
  });
}
