// RN6: el barbero cobra el 60% del precio histórico final de cada turno
// completado. El 40% restante queda para el local. La tasa vive acá sola para
// que la liquidación y los reportes no puedan desincronizarse.
const COMMISSION_RATE = 0.6;

export function emptyIncomeTotals() {
  return {
    completed: 0,
    gross: 0,
    commission: 0,
    local: 0,
  };
}

export function addCompletedAppointment(totals, priceSnapshot) {
  const price = Number(priceSnapshot) || 0;
  const commission = Math.round(price * COMMISSION_RATE);
  totals.completed += 1;
  totals.gross += price;
  totals.commission += commission;
  totals.local += price - commission;
}
