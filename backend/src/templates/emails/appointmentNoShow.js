import {
  formatBusinessDate,
  formatBusinessTime,
} from "../../utils/businessTime.js";
import { appLink, detailRow, renderEmail } from "./layout.js";

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
  const appUrl = appLink("/app/turnos");

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

  const html = renderEmail({
    clientName,
    intro: message,
    rows,
    notes: [note],
    cta: { label: "Ver mis turnos", href: appUrl },
    // Este aviso usaba 20px; se mantiene igual que antes.
    noteMargin: 20,
  });

  return { subject, html, text };
}
