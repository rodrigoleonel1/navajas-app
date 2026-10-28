import {
  formatBusinessDate,
  formatBusinessTime,
} from "../../utils/businessTime.js";
import { appLink, detailRow, formatPrice, renderEmail } from "./layout.js";

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
  const appUrl = appLink("/app/turnos");

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

  const html = renderEmail({
    clientName,
    intro: "Te recordamos tu turno en Navajas.",
    rows,
    cta: { label: "Ver mis turnos", href: appUrl },
    footerNote: "Si no podés asistir, avisanos desde Mis turnos.",
  });

  return { subject, html, text };
}
