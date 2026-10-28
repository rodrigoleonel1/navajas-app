import { config } from "../../config.js";
import {
  formatBusinessDate,
  formatBusinessTime,
} from "../../utils/businessTime.js";

// Mismos colores que el tema principal de la app.
const PRIMARY_COLOR = "#60a5fa";
const PRIMARY_FOREGROUND = "#11100f";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Mismo formato que el frontend: "$15.000".
function formatPrice(price) {
  const value = Number(price) || 0;
  return `$${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function detailRow(label, value, strong = false) {
  return `<tr>
    <td style="padding:6px 0;color:#6b6b6b;font-size:14px;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;text-align:right;font-size:14px;${strong ? "font-weight:bold;" : ""}">${escapeHtml(value)}</td>
  </tr>`;
}

// Recordatorio del día anterior (RN9). El cron diario lo dispara a las 12:00
// de Argentina para los turnos del día comercial siguiente.
export function buildAppointmentReminder(payload = {}) {
  const {
    clientName = "cliente",
    barberName = "",
    services = [],
    startAt,
    endAt,
    duration,
    price,
  } = payload;

  const dateLabel = startAt ? formatBusinessDate(startAt) : "";
  const startLabel = startAt ? formatBusinessTime(startAt) : "";
  const endLabel = endAt ? formatBusinessTime(endAt) : "";
  const timeLabel = endLabel
    ? `${startLabel} a ${endLabel} hs`
    : `${startLabel} hs`;
  const servicesLabel = services.length
    ? services.join(", ")
    : "Servicio";
  const durationLabel = duration ? `${duration} min` : "";
  const priceLabel = formatPrice(price);
  const appUrl = `${config.APP_URL.replace(/\/+$/, "")}/app/cliente/turnos`;

  const subject = dateLabel
    ? `Recordatorio de turno — Navajas Barber, ${dateLabel} a las ${startLabel}`
    : "Recordatorio de turno — Navajas Barber";

  const text = [
    `Hola ${clientName},`,
    "",
    "Te recordamos tu turno en Navajas.",
    "",
    `Barbero: ${barberName}`,
    `Servicios: ${servicesLabel}`,
    `Fecha: ${dateLabel}`,
    `Hora: ${timeLabel}`,
    durationLabel ? `Duración: ${durationLabel}` : null,
    `Total: ${priceLabel}`,
    "",
    `Ver mis turnos: ${appUrl}`,
    "",
    "Si no podés asistir, avisanos desde Mis turnos.",
    "",
    "Navajas",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const rows = [
    detailRow("Barbero", barberName),
    detailRow("Servicios", servicesLabel),
    detailRow("Fecha", dateLabel),
    detailRow("Hora", timeLabel),
    durationLabel ? detailRow("Duración", durationLabel) : "",
    detailRow("Total", priceLabel, true),
  ].join("");

  const html = `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:${PRIMARY_COLOR};padding:20px 24px;color:${PRIMARY_FOREGROUND};font-size:18px;letter-spacing:2px;font-weight:bold;">
                NAVAJAS BARBER
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 12px;font-size:16px;">Hola ${escapeHtml(clientName)},</p>
                <p style="margin:0 0 20px;font-size:14px;color:#555555;">
                  Te recordamos tu turno en Navajas.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${rows}
                </table>
                <p style="margin:24px 0 0;text-align:center;">
                  <a href="${escapeHtml(appUrl)}" style="display:inline-block;background:${PRIMARY_COLOR};color:${PRIMARY_FOREGROUND};text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:bold;">
                    Ver mis turnos
                  </a>
                </p>
                <p style="margin:20px 0 0;font-size:12px;color:#777777;">
                  Si no podés asistir, avisanos desde Mis turnos.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#faf8f4;font-size:11px;color:#999999;">
                Navajas — Barbería
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, html, text };
}
