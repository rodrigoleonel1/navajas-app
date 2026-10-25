import { Appointment } from "../models/Appointment.js";
import {
  businessDayStartUtc,
  shiftDayKey,
  tzParts,
} from "../utils/businessTime.js";
import {
  createAppointmentNotifications,
  scheduleNotificationSend,
} from "./notification.service.js";

// RN9: el cron diario corre a las 12:00 de Argentina y genera recordatorios
// para los turnos del día comercial siguiente. No busca una ventana exacta de
// 24 h porque el plan Hobby de Vercel solo permite una ejecución diaria.
export async function sendAppointmentReminders({
  now = new Date(),
  limit = 100,
} = {}) {
  const todayKey = tzParts(now).dayKey;
  const tomorrowKey = shiftDayKey(todayKey, 1);
  const start = businessDayStartUtc(tomorrowKey);
  const end = businessDayStartUtc(shiftDayKey(tomorrowKey, 1));
  const safeLimit =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, 200) : 100;

  const appointments = await Appointment.find({
    status: "pending",
    start_at: { $gte: start, $lt: end },
  })
    .sort({ start_at: 1 })
    .limit(safeLimit)
    .select(
      "_id start_at end_at duration_snapshot price_snapshot extra client_id barber_id service_ids",
    )
    .populate("client_id", "name email")
    .populate("barber_id", "name")
    .populate("service_ids", "name")
    .lean();

  const summary = {
    date: tomorrowKey,
    scanned: appointments.length,
    queued: 0,
    skipped: 0,
    failed: 0,
  };

  for (const appointment of appointments) {
    const client = appointment.client_id;
    if (!client?.email) {
      summary.skipped += 1;
      continue;
    }

    try {
      const { email, inApp } = await createAppointmentNotifications({
        appointmentId: appointment._id,
        targetUser: { id: client._id, email: client.email },
        type: "recordatorio_turno",
        payload: {
          clientName: client.name,
          barberName: appointment.barber_id?.name ?? "",
          services: (appointment.service_ids ?? [])
            .map((service) => service?.name)
            .filter(Boolean),
          startAt: new Date(appointment.start_at).toISOString(),
          endAt: new Date(appointment.end_at).toISOString(),
          duration: appointment.duration_snapshot,
          price: appointment.price_snapshot,
          extra: appointment.extra ?? 0,
        },
      });

      if (!email && !inApp) {
        summary.skipped += 1;
        continue;
      }
      if (email) scheduleNotificationSend(email._id, "reminder");
      summary.queued += 1;
    } catch (err) {
      summary.failed += 1;
      console.error(
        "[reminder] no se pudo crear el recordatorio",
        appointment._id?.toString?.() ?? "",
        err?.code || "",
        err?.message || err,
      );
    }
  }

  return summary;
}
