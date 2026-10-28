import {
  formatBusinessDate,
  formatBusinessTime,
} from "../../utils/businessTime.js";
import {
  appLink,
  detailRow,
  formatPrice,
  renderEmail,
} from "./layout.js";

// Template de confirmación de turno (RN0).
export function buildAppointmentConfirmation(payload = {}) {
  const {
    clientName = "cliente",
    barberName = "",
    services = [],
    startAt,
    endAt,
    duration,
    price,
    extra = 0,
    voucherDiscount = 0,
    offerDiscount = 0,
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
  const totalValue = Number(price) || 0;
  const extraValue = Number(extra) || 0;
  const voucherValue = Number(voucherDiscount) || 0;
  const offerValue = Number(offerDiscount) || 0;
  // price_snapshot = base - oferta + recargo - vale.
  const baseValue = Math.max(
    totalValue - extraValue + voucherValue + offerValue,
    0,
  );
  const hasExtra = extraValue > 0;
  const hasVoucher = voucherValue > 0;
  const hasOffer = offerValue > 0;
  const showBreakdown = hasExtra || hasVoucher || hasOffer;
  const priceLabel = formatPrice(totalValue);
  const baseLabel = formatPrice(baseValue);
  const extraLabel = formatPrice(extraValue);
  const voucherLabel = formatPrice(voucherValue);
  const offerLabel = formatPrice(offerValue);

  const subject = dateLabel
    ? `Turno confirmado — Navajas Barber, ${dateLabel} a las ${startLabel}`
    : "Turno confirmado — Navajas Barber";

  const text = [
    `Hola ${clientName},`,
    "",
    "Tu turno en Navajas quedó confirmado.",
    "",
    `Barbero: ${barberName}`,
    `Servicios: ${servicesLabel}`,
    `Fecha: ${dateLabel}`,
    `Hora: ${timeLabel}`,
    durationLabel ? `Duración: ${durationLabel}` : null,
    showBreakdown ? `Precio base: ${baseLabel}` : null,
    hasOffer ? `Oferta: -${offerLabel}` : null,
    hasExtra ? `Recargo por inasistencias (20%): ${extraLabel}` : null,
    hasVoucher ? `Vale: -${voucherLabel}` : null,
    `Total: ${priceLabel}`,
    "",
    hasExtra
      ? "Se aplicó un recargo del 20% por inasistencias. El contador se reinició."
      : null,
    hasOffer ? "Se aplicó una oferta de descuento." : null,
    hasVoucher ? "Se aplicó un vale de descuento." : null,
    `Ver mis turnos: ${appLink("/app/cliente/turnos")}`,
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
    showBreakdown ? detailRow("Precio base", baseLabel) : "",
    hasOffer ? detailRow("Oferta", `-${offerLabel}`) : "",
    hasExtra ? detailRow("Recargo (20%)", extraLabel) : "",
    hasVoucher ? detailRow("Vale", `-${voucherLabel}`) : "",
    detailRow("Total", priceLabel, true),
  ].join("");

  const notes = [
    hasExtra
      ? "Se aplicó un recargo del 20% por inasistencias. El contador se reinició."
      : null,
    hasOffer ? "Se aplicó una oferta de descuento." : null,
    hasVoucher ? "Se aplicó un vale de descuento." : null,
  ].filter((note) => note !== null);

  const html = renderEmail({
    clientName,
    intro: "Tu turno quedó confirmado.",
    rows,
    notes,
    cta: { label: "Ver mis turnos", href: appLink("/app/cliente/turnos") },
    footerNote: "Si no podés asistir, avisanos desde Mis turnos.",
  });

  return { subject, html, text };
}
