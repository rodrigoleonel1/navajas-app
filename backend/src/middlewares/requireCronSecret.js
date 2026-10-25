import { timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

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
export function requireCronSecret(req, res, next) {
  if (!config.CRON_SECRET) {
    res.status(503).json({
      error: {
        code: "CRON_NOT_CONFIGURED",
        message: "CRON_SECRET no está configurado",
      },
    });
    return;
  }

  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !secretsMatch(token, config.CRON_SECRET)) {
    res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Cron no autorizado" },
    });
    return;
  }

  next();
}
