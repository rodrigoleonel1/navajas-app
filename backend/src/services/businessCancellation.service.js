import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import {
  businessDayStartUtc,
  DAY_MS,
  tzParts,
} from "../utils/businessTime.js";
import { createAppError } from "../utils/appError.js";
import { toObjectIdOrThrow } from "../utils/objectId.js";
import {
  assertWithinBarberAvailability,
  getNonWorkingReason,
} from "./availability.service.js";
import {
  enqueueStatusNotification,
  enqueueVoucherNotification,
} from "./appointmentNotifications.service.js";
import {
  issueAdminCancellationVoucher,
  releaseVoucherFromAppointment,
} from "./voucher.service.js";

// RN7/RN10: cuando el negocio cancela (feriado, franco, cambio de jornada),
// el turno se libera sin penalización y el cliente recibe email + in-app.
export const BUSINESS_CANCEL_REASONS = [
  "holiday",
  "day_off",
  "weekly_day_off",
  "working_hours",
];

const REASON_TEXT = {
  holiday: "El local estará cerrado por el feriado",
  day_off: "El barbero no atenderá ese día",
  weekly_day_off: "El barbero no atiende ese día de la semana",
  working_hours:
    "Se modificó la jornada del barbero y ese horario ya no está disponible",
};

function reasonTextFor(reason, holidayName = "") {
  if (reason === "holiday" && holidayName) {
    return `El local estará cerrado por el feriado «${holidayName}»`;
  }
  return REASON_TEXT[reason] ?? REASON_TEXT.working_hours;
}

// Cancela un turno puntual dentro de una transacción, devuelve el vale que
// tenía aplicado y emite el vale de RN7. Es idempotente: si el turno ya no
// está pendiente devuelve null.
export async function cancelPendingAppointmentByBusiness({
  appointmentId,
  reason,
  reasonText,
  actorId = null,
}) {
  if (!BUSINESS_CANCEL_REASONS.includes(reason)) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "Motivo de cancelación inválido",
    );
  }
  const appointmentOid = toObjectIdOrThrow(
    appointmentId,
    "ID de turno inválido",
  );

  const session = await mongoose.startSession();
  let cancelled = null;
  let voucher = null;
  try {
    await session.withTransaction(async () => {
      cancelled = await Appointment.findOneAndUpdate(
        { _id: appointmentOid, status: "pending" },
        {
          $set: {
            status: "cancelled",
            cancel_type: "free",
            cancel_reason: reason,
          },
        },
        { returnDocument: "after", session },
      );

      if (!cancelled) return;

      // El vale se consume al reservar; si el local cancela, se devuelve.
      if (cancelled.voucher_id) {
        await releaseVoucherFromAppointment({
          voucherId: cancelled.voucher_id,
          appointmentId: cancelled._id,
          session,
        });
      }

      voucher = await issueAdminCancellationVoucher({
        appointment: cancelled,
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  if (!cancelled) return null;

  const populated = await Appointment.findById(appointmentOid)
    .populate("barber_id", "name email")
    .populate("client_id", "name email")
    .populate("service_ids", "name")
    .lean();

  if (!populated) return null;

  // El turno ya quedó cancelado: un fallo al encolar el aviso no debe hacer
  // que el barrido lo cuente como cancelación fallida.
  try {
    await enqueueStatusNotification({
      appointment: populated,
      type: "cancelacion_turno",
      cancelType: "free",
      cancelledByAdmin: true,
      actorId,
      reasonText: reasonText ?? reasonTextFor(reason),
    });

    if (voucher) {
      await enqueueVoucherNotification({ appointment: populated, voucher });
    }
  } catch (err) {
    console.error(
      "[business-cancel] turno cancelado pero falló la notificación",
      String(appointmentOid),
      err?.code || "",
      err?.message || err,
    );
  }

  return { appointment: populated, voucher };
}

// Cancela de a uno para no perder el resto si un turno falla.
async function cancelMany(items, { actorId = null, holidayName = "" } = {}) {
  let cancelled = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const result = await cancelPendingAppointmentByBusiness({
        appointmentId: item.id,
        reason: item.reason,
        reasonText: reasonTextFor(item.reason, holidayName),
        actorId,
      });
      if (result) cancelled += 1;
    } catch (err) {
      failed += 1;
      console.error(
        "[business-cancel] no se pudo cancelar el turno",
        String(item.id),
        err?.code || "",
        err?.message || err,
      );
    }
  }

  return { cancelled, failed };
}

// RN10: al crear (o mover) un feriado se cancelan los turnos pendientes de ese
// día. Un feriado pasado no tiene turnos futuros, así que no hace nada.
export async function cancelAppointmentsOnHoliday({
  dayKey,
  holidayName = "",
  actorId = null,
  now = new Date(),
}) {
  const dayStart = businessDayStartUtc(dayKey);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  if (dayEnd.getTime() <= now.getTime()) {
    return { cancelled: 0, failed: 0 };
  }

  const appointments = await Appointment.find({
    status: "pending",
    start_at: { $gte: dayStart, $lt: dayEnd },
  })
    .select("_id start_at")
    .lean();

  // Si el feriado es hoy, solo se cancelan los turnos que todavía no empezaron.
  const upcoming = appointments.filter(
    (appointment) => new Date(appointment.start_at).getTime() >= now.getTime(),
  );

  if (upcoming.length === 0) {
    return { cancelled: 0, failed: 0 };
  }

  return cancelMany(
    upcoming.map((appointment) => ({
      id: appointment._id,
      reason: "holiday",
    })),
    { actorId, holidayName },
  );
}

function mapNonWorkingReason(reason) {
  if (reason === "holiday") return "holiday";
  if (reason === "weekly") return "weekly_day_off";
  if (reason === "one-off") return "day_off";
  return "working_hours";
}

// RN10: tras cambiar la jornada, los francos o los días de la semana, se
// cancelan los turnos pendientes que quedaron fuera de la nueva disponibilidad.
export async function cancelInvalidAppointmentsForBarber({
  barberId,
  barberProfile,
  holidayKeys = new Set(),
  actorId = null,
  now = new Date(),
}) {
  const barberOid = toObjectIdOrThrow(barberId, "ID de barbero inválido");

  const upcoming = await Appointment.find({
    barber_id: barberOid,
    status: "pending",
    start_at: { $gte: now },
  })
    .select("_id start_at end_at")
    .sort({ start_at: 1 })
    .lean();

  const toCancel = [];
  for (const appointment of upcoming) {
    const start = new Date(appointment.start_at);
    const end = new Date(appointment.end_at);
    try {
      assertWithinBarberAvailability(start, end, barberProfile, holidayKeys);
    } catch {
      const reason = getNonWorkingReason(
        tzParts(start),
        barberProfile,
        holidayKeys,
      );
      toCancel.push({
        id: appointment._id,
        reason: mapNonWorkingReason(reason),
      });
    }
  }

  if (toCancel.length === 0) {
    return { cancelled: 0, failed: 0 };
  }

  return cancelMany(toCancel, { actorId });
}
