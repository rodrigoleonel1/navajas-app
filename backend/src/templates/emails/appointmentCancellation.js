import {
  formatBusinessDate,
  formatBusinessTime,
} from "../../utils/businessTime.js";
import {
  appLink,
  detailRow,
  escapeHtml,
  PRIMARY_COLOR,
  renderEmail,
} from "./layout.js";

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
  const appUrl = appLink("/app/turnos");
  const voucherUrl = appLink("/app/vales");

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

  // La nota del vale incluye un link, por eso se pasa como HTML ya escapado.
  const notes = voucherNote
    ? [
        {
          html: `${escapeHtml(voucherNote)} <a href="${escapeHtml(voucherUrl)}" style="color:${PRIMARY_COLOR};">Ver mis vales</a>`,
        },
      ]
    : [];

  const html = renderEmail({
    clientName,
    intro: message,
    rows,
    notes,
    cta: { label: "Ver mis turnos", href: appUrl },
  });

  return { subject, html, text };
}
