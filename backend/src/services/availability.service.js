import { createAppError } from "../utils/appError.js";
import {
  businessDayStartUtc,
  DAY_MS,
  dayKeyUTC,
  parseWorkHour,
  tzParts,
} from "../utils/businessTime.js";

// Jornada por defecto cuando el barbero no configuró workingHours.
export const DEFAULT_WORKING_HOURS = { start: "09:00", end: "18:00" };
const DEFAULT_OPEN_MINUTES = parseWorkHour(
  DEFAULT_WORKING_HOURS.start,
  9 * 60,
);
const DEFAULT_CLOSE_MINUTES = parseWorkHour(
  DEFAULT_WORKING_HOURS.end,
  18 * 60,
);

// Jornada del barbero en minutos desde la medianoche.
export function getWorkingBounds(barberProfile) {
  const workingHours = barberProfile?.workingHours ?? {};
  return {
    open: parseWorkHour(workingHours.start, DEFAULT_OPEN_MINUTES),
    close: parseWorkHour(workingHours.end, DEFAULT_CLOSE_MINUTES),
  };
}

// RN10: el turno debe caer dentro de la jornada del barbero y en un día
// que no sea franco, franco semanal ni feriado global. Todo en zona comercial.
// Devuelve el motivo del bloqueo o null si el día es laborable.
export function getNonWorkingReason(parts, barberProfile, holidayKeys = new Set()) {
  if (holidayKeys.has(parts.dayKey)) {
    return "holiday";
  }
  const weeklyDaysOff = barberProfile?.weeklyDaysOff ?? [];
  if (weeklyDaysOff.includes(parts.weekday)) {
    return "weekly";
  }
  const daysOff = barberProfile?.daysOff ?? [];
  if (
    daysOff.some((dayOff) => dayKeyUTC(new Date(dayOff)) === parts.dayKey)
  ) {
    return "one-off";
  }
  return null;
}

export function assertWithinBarberAvailability(
  start,
  end,
  barberProfile,
  holidayKeys = new Set(),
) {
  const { open, close } = getWorkingBounds(barberProfile);

  const startParts = tzParts(start);
  const endParts = tzParts(end);
  if (startParts.dayKey !== endParts.dayKey) {
    throw createAppError(
      400,
      "OUT_OF_WORKING_HOURS",
      "El turno debe empezar y terminar el mismo día",
    );
  }

  if (startParts.minutes < open || endParts.minutes > close) {
    throw createAppError(
      400,
      "OUT_OF_WORKING_HOURS",
      "El turno está fuera de la jornada laboral del barbero",
    );
  }

  const nonWorkingReason = getNonWorkingReason(
    startParts,
    barberProfile,
    holidayKeys,
  );
  if (nonWorkingReason === "holiday") {
    throw createAppError(
      400,
      "HOLIDAY",
      "El negocio no trabaja ese día",
    );
  }
  if (nonWorkingReason) {
    throw createAppError(
      400,
      "BARBER_DAY_OFF",
      "El barbero no trabaja ese día",
    );
  }
}

export function overlaps(candidateStart, candidateEnd, bookings) {
  return bookings.some(
    (booking) => candidateStart < booking.end && candidateEnd > booking.start,
  );
}

// Horarios candidatos de un día comercial: arranca en `startOffset` (minutos
// desde la medianoche) y avanza de a `step` mientras el turno entre antes del
// cierre. El llamador filtra lo que no le sirva.
function* candidateSlots({
  dayStart,
  open,
  close,
  duration,
  step,
  startOffset = open,
}) {
  for (let offset = startOffset; offset + duration <= close; offset += step) {
    const start = new Date(dayStart.getTime() + offset * 60 * 1000);
    yield {
      start,
      end: new Date(start.getTime() + duration * 60 * 1000),
    };
  }
}

// Genera slots libres de un día (UTC) dentro de [open, close] con paso step.
export function generateDaySlots({ dayStart, open, close, duration, step, bookings, now }) {
  const slots = [];
  for (const slot of candidateSlots({ dayStart, open, close, duration, step })) {
    if (slot.end <= now) continue;
    if (overlaps(slot.start, slot.end, bookings)) continue;
    slots.push({
      startAt: slot.start.toISOString(),
      endAt: slot.end.toISOString(),
    });
  }
  return slots;
}

// Busca el próximo slot libre desde `from` (inclusive, redondeado al step)
// recorriendo el día actual y los siguientes hasta horizonDays.
export function findNextAvailable({
  from,
  duration,
  barberProfile,
  holidayKeys = new Set(),
  bookings,
  step,
  horizonDays,
}) {
  const { open, close } = getWorkingBounds(barberProfile);
  const now = new Date();

  const fromParts = tzParts(from);
  const baseDay = businessDayStartUtc(fromParts.dayKey);

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const dayStart = new Date(baseDay.getTime() + dayOffset * DAY_MS);
    const dayParts = tzParts(dayStart);
    if (getNonWorkingReason(dayParts, barberProfile, holidayKeys)) continue;

    let startOffset = open;
    if (dayOffset === 0) {
      const fromMin =
        fromParts.dayKey === dayParts.dayKey ? fromParts.minutes : open;
      // Redondea hacia arriba al múltiplo de step desde open.
      startOffset = Math.max(
        open,
        open + Math.ceil((fromMin - open) / step) * step,
      );
    }

    for (const slot of candidateSlots({
      dayStart,
      open,
      close,
      duration,
      step,
      startOffset,
    })) {
      if (slot.start < from || slot.end <= now) continue;
      const slotParts = tzParts(slot.start);
      const slotEndParts = tzParts(slot.end);
      if (
        slotParts.dayKey !== slotEndParts.dayKey ||
        slotParts.dayKey !== dayParts.dayKey
      ) {
        continue;
      }
      if (overlaps(slot.start, slot.end, bookings)) continue;
      return {
        startAt: slot.start.toISOString(),
        endAt: slot.end.toISOString(),
      };
    }
  }
  return null;
}
