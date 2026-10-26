import { timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import { createAppError } from "../utils/appError.js";

function secretsMatch(provided, expected) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

// Vercel Cron envía Authorization: Bearer <CRON_SECRET>. Si la variable no
// está configurada, la ruta queda cerrada para no exponer el envío masivo.
export function requireCronSecret(req, _res, next) {
  if (!config.CRON_SECRET) {
    next(
      createAppError(
        503,
        "CRON_NOT_CONFIGURED",
        "CRON_SECRET no está configurado.",
      ),
    );
    return;
  }

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !secretsMatch(token, config.CRON_SECRET)) {
    next(createAppError(401, "UNAUTHORIZED", "Cron no autorizado."));
    return;
  }

  next();
}
