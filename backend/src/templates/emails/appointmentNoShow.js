import { config } from "../../config.js";
import {
  formatBusinessDate,
  formatBusinessTime,
} from "../../utils/businessTime.js";

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

function detailRow(label, value) {
  return `<tr>
    <td style="padding:6px 0;color:#6b6b6b;font-size:14px;">${escapeHtml(label)}</td>
    <td style="padding:6px 0;text-align:right;font-size:14px;">${escapeHtml(value)}</td>
  </tr>`;
}

// Template de inasistencia marcada por el admin (RN4/RN5).
export function buildAppointmentNoShow(payload = {}) {
  const {
    clientName = "cliente",
    barberName = "",
    services = [],
    startAt,
    endAt,
  } = payload;

  const dateLabel = startAt ? formatBusinessDate(startAt) : "";
  const startLabel = startAt ? formatBusinessTime(startAt) : "";
  const endLabel = endAt ? formatBusinessTime(endAt) : "";
  const timeLabel = endLabel
    ? `${startLabel} a ${endLabel} hs`
    : `${startLabel} hs`;
  const servicesLabel = services.length ? services.join(", ") : "Servicio";
  const appUrl = `${config.APP_URL.replace(/\/+$/, "")}/app/client/turnos`;

  const subject = "Inasistencia registrada — Navajas Barber";
  const message =
    "El local registró una inasistencia para tu turno. El horario no se libera.";
  const note =
    "Si acumulás 3 inasistencias en los últimos 2 meses, la próxima reserva tendrá un recargo del 20%.";

  const text = [
    `Hola ${clientName},`,
    "",
    message,
    "",
    `Barbero: ${barberName}`,
    `Servicios: ${servicesLabel}`,
    `Fecha: ${dateLabel}`,
    `Hora: ${timeLabel}`,
    "",
    note,
    "",
    `Ver mis turnos: ${appUrl}`,
    "",
    "Navajas",
  ].join("\n");

  const rows = [
    detailRow("Barbero", barberName),
    detailRow("Servicios", servicesLabel),
    detailRow("Fecha", dateLabel),
    detailRow("Hora", timeLabel),
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
                  ${escapeHtml(message)}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${rows}
                </table>
                <p style="margin:20px 0 0;font-size:12px;color:#777777;">
                  ${escapeHtml(note)}
                </p>
                <p style="margin:24px 0 0;text-align:center;">
                  <a href="${escapeHtml(appUrl)}" style="display:inline-block;background:${PRIMARY_COLOR};color:${PRIMARY_FOREGROUND};text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:bold;">
                    Ver mis turnos
                  </a>
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
