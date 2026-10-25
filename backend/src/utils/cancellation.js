const HOUR_MS = 60 * 60 * 1000;

// RN4: el admin puede marcar inasistencia recién 15 min después del inicio.
export const NO_SHOW_TOLERANCE_MS = 15 * 60 * 1000;

// RN3: ventanas de cancelación del cliente.
// - free: >= 24h, libera el horario y no cuenta inasistencia.
// - late: 4-24h, libera el horario pero cuenta inasistencia.
// - blocked: < 4h, no libera el horario y cuenta inasistencia.
export function getCancellationPolicy(startAt, now = new Date()) {
  const remaining = new Date(startAt).getTime() - new Date(now).getTime();

  if (remaining <= 0) return null;
  if (remaining >= 24 * HOUR_MS) {
    return { kind: "free", releasesSlot: true, countsAsNoShow: false };
  }
  if (remaining >= 4 * HOUR_MS) {
    return { kind: "late", releasesSlot: true, countsAsNoShow: true };
  }
  return { kind: "blocked", releasesSlot: false, countsAsNoShow: true };
}

export function isNoShowEligible(startAt, now = new Date()) {
  return (
    new Date(now).getTime() >=
    new Date(startAt).getTime() + NO_SHOW_TOLERANCE_MS
  );
}
