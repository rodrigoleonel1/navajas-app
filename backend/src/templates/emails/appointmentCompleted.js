import {
  formatBusinessDate,
  formatBusinessTime,
} from "../../utils/businessTime.js";
import { appLink, detailRow, renderEmail } from "./layout.js";

// Template de agradecimiento al completar un turno. El cliente puede calificar
// al barbero desde "Mis turnos" (EP-7).
export function buildAppointmentCompleted(payload = {}) {
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
  const appUrl = appLink("/app/turnos");

  const subject = "Gracias por tu visita — Navajas Barber";
  const message = "Gracias por tu visita. Tu turno quedó completado.";
  const note =
    "¿Cómo estuvo tu experiencia? Calificá a tu barbero con 1 a 5 estrellas desde Mis turnos.";

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
    `Calificar mi turno: ${appUrl}`,
    "",
    "Navajas",
  ].join("\n");

  const rows = [
    detailRow("Barbero", barberName),
    detailRow("Servicios", servicesLabel),
    detailRow("Fecha", dateLabel),
    detailRow("Hora", timeLabel),
  ].join("");

  const html = renderEmail({
    clientName,
    intro: message,
    rows,
    notes: [note],
    cta: { label: "Calificar mi turno", href: appUrl },
  });

  return { subject, html, text };
}
