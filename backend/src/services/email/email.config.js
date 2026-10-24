import { config } from "../../config.js";
import { createEmailError, EMAIL_ERROR_CODES } from "./email.errors.js";

// Proveedores implementados. `console` no envía: imprime el email en logs
// para desarrollo/CI. `smtp` usa Nodemailer (Gmail, Mailtrap, etc.).
export const EMAIL_PROVIDERS = ["console", "smtp"];

// Valida la configuración del proveedor elegido. Devuelve la lista de
// variables faltantes para avisar al arrancar sin romper la API: un fallo
// de email nunca debe impedir reservar (alcance de la tarjeta).
export function getEmailConfigErrors() {
  const errors = [];

  if (!EMAIL_PROVIDERS.includes(config.EMAIL_PROVIDER)) {
    errors.push(`EMAIL_PROVIDER inválido ("${config.EMAIL_PROVIDER}")`);
    return errors;
  }

  if (!Number.isInteger(config.EMAIL_TIMEOUT_MS) || config.EMAIL_TIMEOUT_MS <= 0) {
    errors.push("EMAIL_TIMEOUT_MS");
  }

  if (config.EMAIL_PROVIDER === "console") return errors;

  if (!config.MAIL_FROM) errors.push("MAIL_FROM");
  if (!config.SMTP_HOST) errors.push("SMTP_HOST");
  if (!Number.isInteger(config.SMTP_PORT) || config.SMTP_PORT <= 0) {
    errors.push("SMTP_PORT");
  }
  if (!config.SMTP_USER) errors.push("SMTP_USER");
  if (!config.SMTP_PASS) errors.push("SMTP_PASS");

  return errors;
}

// Lanza si la configuración está incompleta. Se usa al enviar para registrar
// el fallo en notifications sin afectar la reserva.
export function assertEmailConfig() {
  const errors = getEmailConfigErrors();
  if (errors.length > 0) {
    throw createEmailError(
      EMAIL_ERROR_CODES.CONFIG,
      `Configuración de email inválida o incompleta (${config.EMAIL_PROVIDER}): ${errors.join(", ")}`,
      { errors },
    );
  }
}
