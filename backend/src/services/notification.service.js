import { Notification } from "../models/Notification.js";
import { buildAppointmentConfirmation } from "../templates/emails/appointmentConfirmation.js";
import { createAppError } from "../utils/appError.js";
import { toObjectIdOrThrow } from "../utils/objectId.js";
import { sendEmail } from "./email/email.service.js";

// Después de N intentos la notificación queda "failed" y no se reintenta más.
const MAX_ATTEMPTS = 5;

// Si una notificación quedó en "sending" más de este tiempo, se considera
// abandonada por un proceso que murió y se puede reintentar.
const STALE_SENDING_MS = 5 * 60 * 1000;

// Crea el registro de la notificación en estado "pending". No envía nada.
// Es idempotente: el mismo turno + tipo + canal devuelve el registro
// existente en lugar de duplicarlo.
export async function createNotification({
  appointmentId,
  targetUser,
  type,
  channel = "email",
  payload,
}) {
  if (!targetUser?.email) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "El usuario destino no tiene email",
    );
  }
  if (!type) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "Falta el type de la notificación",
    );
  }
  if (!payload || typeof payload !== "object") {
    throw createAppError(400, "VALIDATION_ERROR", "Falta el payload");
  }

  const appointmentOid = toObjectIdOrThrow(
    appointmentId,
    "ID de turno inválido",
  );
  const targetUserOid = toObjectIdOrThrow(
    targetUser.id,
    "ID de usuario destino inválido",
  );

  try {
    const notification = await Notification.findOneAndUpdate(
      {
        appointment_id: appointmentOid,
        type,
        channel,
      },
      {
        $setOnInsert: {
          appointment_id: appointmentOid,
          target_user_id: targetUserOid,
          target_email: targetUser.email.toLowerCase().trim(),
          channel,
          type,
          status: "pending",
          payload,
          attempts: 0,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    ).lean();

    return notification;
  } catch (err) {
    // Dos requests concurrentes pueden chocar contra el índice único.
    if (err?.code === 11000) {
      const existing = await Notification.findOne({
        appointment_id: appointmentOid,
        type,
        channel,
      }).lean();
      if (existing) return existing;
    }
    throw err;
  }
}

async function markAsFailed(notificationId, code, message) {
  const lastError = { code, message };

  await Notification.updateOne(
    { _id: notificationId },
    { $set: { status: "failed", last_error: lastError } },
  );

  return { status: "failed", error: lastError };
}

// Toma una notificación, la renderiza, la envía y actualiza su estado.
// Nunca propaga el error de envío: lo registra y devuelve "failed" para que
// la reserva no se vea afectada.
export async function sendNotification(notificationId) {
  const notificationOid = toObjectIdOrThrow(
    notificationId,
    "ID de notificación inválido",
  );
  const staleBefore = new Date(Date.now() - STALE_SENDING_MS);

  // Claim atómico: solo un proceso puede pasar la notificación a "sending".
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationOid,
      $or: [
        {
          status: { $in: ["pending", "failed"] },
          attempts: { $lt: MAX_ATTEMPTS },
        },
        {
          status: "sending",
          attempts: { $lt: MAX_ATTEMPTS },
          updated_at: { $lt: staleBefore },
        },
      ],
    },
    {
      $set: { status: "sending" },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after" },
  ).lean();

  if (!notification) {
    const existing = await Notification.findById(notificationOid)
      .select("status attempts")
      .lean();

    if (!existing) return { status: "skipped", reason: "not_found" };
    if (existing.status === "sent") {
      return { status: "skipped", reason: "already_sent" };
    }
    if (existing.attempts >= MAX_ATTEMPTS) {
      return { status: "skipped", reason: "max_attempts" };
    }
    return { status: "skipped", reason: "in_progress" };
  }

  let content;
  try {
    content = buildAppointmentConfirmation(notification.payload ?? {});
  } catch (err) {
    console.error(
      `[notification] error de template ${notification._id}: ${err.message}`,
    );
    return markAsFailed(
      notification._id,
      "NOTIFICATION_RENDER_ERROR",
      err.message,
    );
  }

  try {
    await sendEmail({
      to: notification.target_email,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    await Notification.updateOne(
      { _id: notification._id },
      {
        $set: { status: "sent" },
        $unset: { last_error: 1 },
      },
    );

    return { status: "sent" };
  } catch (err) {
    const code = err?.code || "EMAIL_PROVIDER_ERROR";
    const message = err?.message || "Error al enviar el email";

    console.error(
      `[notification] fallo al enviar ${notification._id}: ${code} ${message}`,
    );

    return markAsFailed(notification._id, code, message);
  }
}

// Reintenta las notificaciones pendientes/fallidas y las que quedaron
// colgadas en "sending". Pensado para un script manual o un cron futuro.
// `appointmentId` es opcional y permite limitar el reintento a un turno.
export async function retryPendingNotifications({
  limit = 50,
  appointmentId,
} = {}) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 50;
  const staleBefore = new Date(Date.now() - STALE_SENDING_MS);

  const filter = {
    $or: [
      {
        status: { $in: ["pending", "failed"] },
        attempts: { $lt: MAX_ATTEMPTS },
      },
      {
        status: "sending",
        attempts: { $lt: MAX_ATTEMPTS },
        updated_at: { $lt: staleBefore },
      },
    ],
  };

  if (appointmentId) {
    filter.appointment_id = toObjectIdOrThrow(
      appointmentId,
      "ID de turno inválido",
    );
  }

  const candidates = await Notification.find(filter)
    .sort({ created_at: 1 })
    .limit(safeLimit)
    .select("_id")
    .lean();

  const result = { processed: 0, sent: 0, failed: 0, skipped: 0 };

  for (const candidate of candidates) {
    const outcome = await sendNotification(candidate._id);
    result.processed += 1;

    if (outcome.status === "sent") result.sent += 1;
    else if (outcome.status === "failed") result.failed += 1;
    else result.skipped += 1;
  }

  return result;
}
