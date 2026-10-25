import { config } from "../../config.js";
import { formatBusinessDate } from "../../utils/businessTime.js";

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

// Template del vale emitido por cancelación del admin (RN7).
export function buildVoucherIssued(payload = {}) {
  const {
    clientName = "cliente",
    barberName = "",
    discountPercent = 20,
    issuedAt,
    expiresAt,
    startAt,
  } = payload;

  const discountLabel = `${discountPercent}%`;
  const expiresLabel = expiresAt ? formatBusinessDate(expiresAt) : "";
  const issuedLabel = issuedAt ? formatBusinessDate(issuedAt) : "";
  const appointmentLabel = startAt ? formatBusinessDate(startAt) : "";
  const appUrl = `${config.APP_URL.replace(/\/+$/, "")}/app/client/vales`;

  const subject = `Vale del ${discountLabel} — Navajas Barber`;

  const text = [
    `Hola ${clientName},`,
    "",
    `Recibiste un vale del ${discountLabel} de descuento por la cancelación de tu turno${appointmentLabel ? ` del ${appointmentLabel}` : ""}.`,
    "Se aplicará automáticamente en tu próxima reserva.",
    "",
    `Descuento: ${discountLabel}`,
    expiresLabel ? `Válido hasta: ${expiresLabel}` : null,
    issuedLabel ? `Emitido: ${issuedLabel}` : null,
    barberName ? `Barbero: ${barberName}` : null,
    "",
    `Ver mis vales: ${appUrl}`,
    "",
    "Navajas",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const rows = [
    detailRow("Descuento", discountLabel),
    expiresLabel ? detailRow("Válido hasta", expiresLabel) : "",
    issuedLabel ? detailRow("Emitido", issuedLabel) : "",
    barberName ? detailRow("Barbero", barberName) : "",
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
                  Recibiste un vale del ${escapeHtml(discountLabel)} de descuento por la cancelación de tu turno${appointmentLabel ? ` del ${escapeHtml(appointmentLabel)}` : ""}. Se aplicará automáticamente en tu próxima reserva.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${rows}
                </table>
                <p style="margin:24px 0 0;text-align:center;">
                  <a href="${escapeHtml(appUrl)}" style="display:inline-block;background:${PRIMARY_COLOR};color:${PRIMARY_FOREGROUND};text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:bold;">
                    Ver mis vales
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
