import { User } from "../models/User.js";
import {
  createAppointmentNotifications,
  createStaffInAppNotifications,
  scheduleNotificationSend,
} from "./notification.service.js";

// Aviso interno que acompaña a cada evento del turno. La reserva se maneja
// aparte, en enqueueAppointmentConfirmation.
const STAFF_TYPES = {
  cancelacion_turno: "cancelacion_turno_staff",
  inasistencia_turno: "inasistencia_turno_staff",
};

// Destinatarios internos de un turno: el barbero asignado y todos los admins
// activos. Se excluye a quien hizo la acción para no auto-notificarse.
export async function getStaffTargets({ barber, actorId }) {
  if (!barber || typeof barber !== "object") return [];

  const admins = await User.find({ role: "admin", active: { $ne: false } })
    .select("_id email")
    .lean();

  return [
    { id: barber._id, email: barber.email },
    ...admins.map((admin) => ({ id: admin._id, email: admin.email })),
  ].filter((user) => String(user.id) !== String(actorId ?? ""));
}

// Encola la confirmación por email + in-app (RN0) después de crear el turno.
// El envío no bloquea la respuesta: si falla, queda registrado en la
// notificación para poder reintentarlo más adelante.
export async function enqueueAppointmentConfirmation({
  appointment,
  client,
  barber,
  services,
}) {
  const payload = {
    clientName: client.name,
    barberName: barber.name,
    services: services.map((service) => service.name),
    startAt: new Date(appointment.start_at).toISOString(),
    endAt: new Date(appointment.end_at).toISOString(),
    duration: appointment.duration_snapshot,
    price: appointment.price_snapshot,
    extra: appointment.extra ?? 0,
    voucherDiscount: appointment.voucher_discount ?? 0,
    offerDiscount: appointment.offer_discount ?? 0,
  };

  try {
    const { email } = await createAppointmentNotifications({
      appointmentId: appointment._id,
      targetUser: { id: client._id, email: client.email },
      type: "confirmacion_turno",
      payload,
    });

    if (email) scheduleNotificationSend(email._id, "appointment");
  } catch (err) {
    // Un fallo al encolar tampoco debe afectar la reserva.
    console.error(
      "[appointment] no se pudo crear la notificación",
      err?.code || "",
      err?.message || err,
    );
  }

  // Aviso interno para el barbero y los admins (solo in-app).
  try {
    const targets = await getStaffTargets({ barber });
    await createStaffInAppNotifications({
      appointmentId: appointment._id,
      targets,
      type: "nuevo_turno_staff",
      payload,
    });
  } catch (err) {
    console.error(
      "[appointment] no se pudo avisar al staff del turno nuevo",
      err?.code || "",
      err?.message || err,
    );
  }
}

// Encola el email de cancelación o inasistencia. El turno debe venir
// populado con client_id (name, email), barber_id (name, email) y
// service_ids (name).
export async function enqueueStatusNotification({
  appointment,
  type,
  cancelType = null,
  cancelledByAdmin = false,
  actorId = null,
}) {
  const client = appointment.client_id;
  const payload = {
    clientName: client.name,
    barberName: appointment.barber_id?.name ?? "",
    services: (appointment.service_ids ?? [])
      .map((service) => service?.name)
      .filter(Boolean),
    startAt: new Date(appointment.start_at).toISOString(),
    endAt: new Date(appointment.end_at).toISOString(),
    price: appointment.price_snapshot,
    extra: appointment.extra ?? 0,
    voucherDiscount: appointment.voucher_discount ?? 0,
    cancelType,
    cancelledByAdmin,
  };

  try {
    const { email } = await createAppointmentNotifications({
      appointmentId: appointment._id,
      targetUser: { id: client._id, email: client.email },
      type,
      payload,
    });

    if (email) scheduleNotificationSend(email._id, "appointment");
  } catch (err) {
    // El cambio de estado ya quedó guardado; un fallo de email no lo revierte.
    console.error(
      "[appointment] no se pudo crear la notificación de estado",
      err?.code || "",
      err?.message || err,
    );
  }

  // Aviso interno para el barbero y los admins (solo in-app).
  const staffType = STAFF_TYPES[type];
  if (staffType) {
    try {
      const targets = await getStaffTargets({
        barber: appointment.barber_id,
        actorId,
      });
      await createStaffInAppNotifications({
        appointmentId: appointment._id,
        targets,
        type: staffType,
        payload,
      });
    } catch (err) {
      console.error(
        "[appointment] no se pudo avisar al staff del cambio de estado",
        err?.code || "",
        err?.message || err,
      );
    }
  }
}

// Aviso de agradecimiento al completar el turno. El cliente puede calificar al
// barbero desde "Mis turnos". Es best-effort: el turno ya quedó completado.
export async function enqueueCompletedNotification({ appointment }) {
  try {
    const client = appointment.client_id;
    const services = Array.isArray(appointment.service_ids)
      ? appointment.service_ids.map((service) => service.name)
      : [];

    const { email } = await createAppointmentNotifications({
      appointmentId: appointment._id,
      targetUser: { id: client._id, email: client.email },
      type: "turno_completado",
      payload: {
        clientName: client.name,
        barberName: appointment.barber_id?.name ?? "",
        services,
        startAt: new Date(appointment.start_at).toISOString(),
        endAt: new Date(appointment.end_at).toISOString(),
      },
    });

    if (email) scheduleNotificationSend(email._id, "appointment");
  } catch (err) {
    // El turno ya quedó completado; el aviso es best-effort.
    console.error(
      "[appointment] no se pudo crear la notificación de turno completado",
      err?.code || "",
      err?.message || err,
    );
  }
}

// RN7/RN8: avisa al cliente que se le emitió un vale (cancelación del admin o
// fidelidad). El turno debe venir populado con client_id (name, email) y
// barber_id (name).
export async function enqueueVoucherNotification({ appointment, voucher }) {
  if (!voucher) return;

  try {
    const client = appointment.client_id;
    const { email } = await createAppointmentNotifications({
      appointmentId: appointment._id,
      targetUser: { id: client._id, email: client.email },
      type: "vale_emitido",
      payload: {
        clientName: client.name,
        barberName: appointment.barber_id?.name ?? "",
        discountPercent: voucher.discount_percent,
        issuedAt: new Date(voucher.issued_at).toISOString(),
        expiresAt: new Date(voucher.expires_at).toISOString(),
        startAt: new Date(appointment.start_at).toISOString(),
        source: voucher.source,
      },
    });

    if (email) scheduleNotificationSend(email._id, "appointment");
  } catch (err) {
    // La cancelación y el vale ya quedaron guardados; el email es best-effort.
    console.error(
      "[appointment] no se pudo crear la notificación del vale",
      err?.code || "",
      err?.message || err,
    );
  }
}
