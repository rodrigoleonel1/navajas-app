import { config } from "../../config.js";
import { assertEmailConfig } from "./email.config.js";
import {
  createEmailError,
  EMAIL_ERROR_CODES,
  toEmailError,
} from "./email.errors.js";
import { getEmailProvider } from "./email.provider.js";

// Corta la espera si el proveedor no responde en EMAIL_TIMEOUT_MS.
function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(
        createEmailError(
          EMAIL_ERROR_CODES.TIMEOUT,
          `El envío de email superó ${timeoutMs} ms`,
        ),
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Punto de entrada único del módulo: valida configuración, elige el adapter,
// aplica timeout y normaliza cualquier fallo a un EmailError.
export async function sendEmail({ to, subject, html, text }) {
  assertEmailConfig();

  if (!to || typeof to !== "string") {
    throw createEmailError(
      EMAIL_ERROR_CODES.CONFIG,
      "Falta el destinatario del email",
    );
  }
  if (!subject) {
    throw createEmailError(
      EMAIL_ERROR_CODES.CONFIG,
      "Falta el asunto del email",
    );
  }
  if (!html && !text) {
    throw createEmailError(
      EMAIL_ERROR_CODES.CONFIG,
      "El email debe tener contenido html o text",
    );
  }

  const provider = getEmailProvider();

  try {
    await withTimeout(
      provider.send({ to, subject, html, text }),
      config.EMAIL_TIMEOUT_MS,
    );
    return { provider: provider.name };
  } catch (err) {
    throw toEmailError(err);
  }
}

// Verifica credenciales/conexión sin enviar. Solo SMTP lo implementa.
export async function verifyEmailProvider() {
  assertEmailConfig();

  const provider = getEmailProvider();
  if (typeof provider.verify !== "function") {
    return { provider: provider.name, verified: true };
  }

  try {
    await provider.verify();
    return { provider: provider.name, verified: true };
  } catch (err) {
    throw toEmailError(err);
  }
}
