import { formatBusinessDate } from "../../utils/businessTime.js";
import { appLink, detailRow, renderEmail } from "./layout.js";

// Template del vale emitido por cancelación del admin (RN7) o por
// fidelidad cada 10 turnos completados (RN8).
export function buildVoucherIssued(payload = {}) {
  const {
    clientName = "cliente",
    barberName = "",
    discountPercent = 20,
    issuedAt,
    expiresAt,
    startAt,
    source = "admin_cancellation",
  } = payload;

  const discountLabel = `${discountPercent}%`;
  const expiresLabel = expiresAt ? formatBusinessDate(expiresAt) : "";
  const issuedLabel = issuedAt ? formatBusinessDate(issuedAt) : "";
  const appointmentLabel = startAt ? formatBusinessDate(startAt) : "";
  const appUrl = appLink("/app/vales");
  const reason =
    source === "fidelity"
      ? "por tu fidelidad cada 10 turnos completados"
      : `por la cancelación de tu turno${appointmentLabel ? ` del ${appointmentLabel}` : ""}`;

  const subject = `Vale del ${discountLabel} — Navajas Barber`;

  const text = [
    `Hola ${clientName},`,
    "",
    `Recibiste un vale del ${discountLabel} de descuento ${reason}.`,
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

  const html = renderEmail({
    clientName,
    intro: `Recibiste un vale del ${discountLabel} de descuento ${reason}. Se aplicará automáticamente en tu próxima reserva.`,
    rows,
    cta: { label: "Ver mis vales", href: appUrl },
  });

  return { subject, html, text };
}
