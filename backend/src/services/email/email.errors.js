// Códigos y helpers de error del módulo de email.
// Se usan para registrar fallos en `notifications.last_error` con un formato
// uniforme, sin exponer detalles del proveedor al cliente final.

export const EMAIL_ERROR_CODES = Object.freeze({
  CONFIG: "EMAIL_CONFIG_ERROR",
  TIMEOUT: "EMAIL_TIMEOUT",
  PROVIDER: "EMAIL_PROVIDER_ERROR",
});

// Error propio del módulo: mantiene code/details sin acoplarse a HTTP.
export function createEmailError(code, message, details) {
  const error = new Error(message);
  error.name = "EmailError";
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

// Normaliza cualquier error del proveedor a un EmailError.
export function toEmailError(err, fallbackCode = EMAIL_ERROR_CODES.PROVIDER) {
  if (err?.name === "EmailError") return err;

  // ETIMEDOUT / ESOCKET suelen ser timeouts de conexión de Nodemailer.
  if (err?.code === "ETIMEDOUT" || err?.code === "ESOCKET") {
    return createEmailError(
      EMAIL_ERROR_CODES.TIMEOUT,
      "El proveedor de email no respondió a tiempo",
      { providerCode: err.code },
    );
  }

  return createEmailError(
    fallbackCode,
    err?.message || "Error al enviar el email",
    err?.code ? { providerCode: err.code } : undefined,
  );
}
