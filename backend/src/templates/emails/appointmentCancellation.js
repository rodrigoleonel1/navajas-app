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

const MESSAGES = {
  free: "Tu turno fue cancelado sin penalización. El horario quedó libre.",
  late: "Tu turno fue cancelado. El horario quedó libre, pero se registró una inasistencia.",
  blocked:
    "Tu turno fue cancelado. Se registró una inasistencia y el horario no se liberó.",
};

// Template de cancelación del cliente (RN3) y del admin (RN7).
export function buildAppointmentCancellation(payload = {}) {
  const {
    clientName = "cliente",
    barberName = "",
    services = [],
    startAt,
    endAt,
    cancelType = "free",
    cancelledByAdmin = false,
  } = payload;

  const dateLabel = startAt ? formatBusinessDate(startAt) : "";
  const startLabel = startAt ? formatBusinessTime(startAt) : "";
  const endLabel = endAt ? formatBusinessTime(endAt) : "";
  const timeLabel = endLabel
    ? `${startLabel} a ${endLabel} hs`
    : `${startLabel} hs`;
  const servicesLabel = services.length ? services.join(", ") : "Servicio";
  const isAdminCancellation = Boolean(cancelledByAdmin);
  const message = isAdminCancellation
    ? "El local canceló tu turno con anticipación. No hay penalización y el horario quedó libre."
    : MESSAGES[cancelType] ?? MESSAGES.free;
  const voucherNote = isAdminCancellation
    ? "Además, te emitimos un vale del 20% de descuento para tu próxima visita."
    : "";
  const appUrl = `${config.APP_URL.replace(/\/+$/, "")}/app/cliente/turnos`;
  const voucherUrl = `${config.APP_URL.replace(/\/+$/, "")}/app/cliente/vales`;

  const subject = isAdminCancellation
    ? dateLabel
      ? `Turno cancelado por el local — Navajas Barber, ${dateLabel} a las ${startLabel}`
      : "Turno cancelado por el local — Navajas Barber"
    : dateLabel
      ? `Turno cancelado — Navajas Barber, ${dateLabel} a las ${startLabel}`
      : "Turno cancelado — Navajas Barber";

  const text = [
    `Hola ${clientName},`,
    "",
    message,
    voucherNote || null,
    "",
    `Barbero: ${barberName}`,
    `Servicios: ${servicesLabel}`,
    `Fecha: ${dateLabel}`,
    `Hora: ${timeLabel}`,
    "",
    `Ver mis turnos: ${appUrl}`,
    isAdminCancellation ? `Ver mis vales: ${voucherUrl}` : null,
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
                ${
                  voucherNote
                    ? `<p style="margin:16px 0 0;font-size:12px;color:#777777;">${escapeHtml(voucherNote)} <a href="${escapeHtml(voucherUrl)}" style="color:${PRIMARY_COLOR};">Ver mis vales</a></p>`
                    : ""
                }
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
