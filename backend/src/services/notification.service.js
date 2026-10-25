import { waitUntil } from "@vercel/functions";
import { Notification } from "../models/Notification.js";
import { buildAppointmentCancellation } from "../templates/emails/appointmentCancellation.js";
import { buildAppointmentConfirmation } from "../templates/emails/appointmentConfirmation.js";
import { buildAppointmentNoShow } from "../templates/emails/appointmentNoShow.js";
import { buildAppointmentReminder } from "../templates/emails/appointmentReminder.js";
import {
  formatBusinessDate,
  formatBusinessTime,
} from "../utils/businessTime.js";
import { createAppError } from "../utils/appError.js";
import { toObjectIdOrThrow } from "../utils/objectId.js";
import { sendEmail } from "./email/email.service.js";

// Después de N intentos la notificación queda "failed" y no se reintenta más.
const MAX_ATTEMPTS = 5;

// Si una notificación quedó en "sending" más de este tiempo, se considera
// abandonada por un proceso que murió y se puede reintentar.
const STALE_SENDING_MS = 5 * 60 * 1000;

const CANCEL_MESSAGES = {
  free: "Tu turno fue cancelado sin penalización.",
  late: "Tu turno fue cancelado. Se registró una inasistencia.",
  blocked:
    "Tu turno fue cancelado. Se registró una inasistencia y el horario no se liberó.",
};

// Crea el registro de la notificación. Los emails quedan "pending" para que
// el envío se pueda reintentar; los avisos in-app se consideran "sent" desde
// que se crean y quedan pendientes de lectura.
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
  const isInApp = channel === "in_app";

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
          status: isInApp ? "sent" : "pending",
          payload,
          attempts: 0,
          ...(isInApp ? { read_at: null } : {}),
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

// Crea el email y el aviso in-app de un mismo evento. Si uno de los dos falla,
// el otro igual queda creado: el turno nunca se revierte por una notificación.
export async function createAppointmentNotifications({
  appointmentId,
  targetUser,
  type,
  payload,
}) {
  const results = await Promise.allSettled([
    createNotification({
      appointmentId,
      targetUser,
      type,
      channel: "email",
      payload,
    }),
    createNotification({
      appointmentId,
      targetUser,
      type,
      channel: "in_app",
      payload,
    }),
  ]);

  const [emailResult, inAppResult] = results;
  const errors = results
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason);

  if (errors.length > 0) {
    console.error(
      "[notification] no se pudo crear alguna notificación",
      errors.map((err) => err?.code || err?.message || String(err)).join(", "),
    );
  }
  if (errors.length === results.length) {
    throw errors[0];
  }

  return {
    email: emailResult.status === "fulfilled" ? emailResult.value : null,
    inApp: inAppResult.status === "fulfilled" ? inAppResult.value : null,
  };
}

// Mantiene vivo el envío en Vercel sin bloquear la respuesta HTTP. En local
// no hay contexto de Vercel, así que se usa el comportamiento anterior.
export function scheduleNotificationSend(
  notificationId,
  context = "notification",
) {
  const sendPromise = sendNotification(notificationId).catch((err) => {
    console.error(
      `[${context}] no se pudo enviar la notificación`,
      err?.code || "",
      err?.message || err,
    );
  });

  if (process.env.VERCEL) {
    try {
      waitUntil(sendPromise);
      return;
    } catch (err) {
      console.error(
        `[${context}] no se pudo registrar waitUntil`,
        err?.message || err,
      );
    }
  }

  void sendPromise;
}

async function markAsFailed(notificationId, code, message) {
  const lastError = { code, message };

  await Notification.updateOne(
    { _id: notificationId },
    { $set: { status: "failed", last_error: lastError } },
  );

  return { status: "failed", error: lastError };
}

function buildNotificationContent(notification) {
  const payload = notification.payload ?? {};

  switch (notification.type) {
    case "confirmacion_turno":
      return buildAppointmentConfirmation(payload);
    case "cancelacion_turno":
      return buildAppointmentCancellation(payload);
    case "inasistencia_turno":
      return buildAppointmentNoShow(payload);
    case "recordatorio_turno":
      return buildAppointmentReminder(payload);
    default:
      throw new Error(`Template no soportado: ${notification.type}`);
  }
}

function buildInAppContent(notification) {
  const payload = notification.payload ?? {};
  const dateLabel = payload.startAt
    ? formatBusinessDate(payload.startAt)
    : "";
  const timeLabel = payload.startAt
    ? formatBusinessTime(payload.startAt)
    : "";
  const whenLabel =
    dateLabel && timeLabel ? `${dateLabel} a las ${timeLabel}` : "";
  const barberLabel = payload.barberName
    ? ` con ${payload.barberName}`
    : "";
  const link = "/app/client/turnos";

  switch (notification.type) {
    case "confirmacion_turno":
      return {
        title: "Turno confirmado",
        message: `Tu turno${barberLabel} quedó confirmado${whenLabel ? ` para el ${whenLabel}` : ""}.`,
        link,
      };
    case "recordatorio_turno":
      return {
        title: "Recordatorio de turno",
        message: `Te recordamos tu turno${barberLabel}${whenLabel ? ` del ${whenLabel}` : ""}.`,
        link,
      };
    case "cancelacion_turno": {
      const cancelMessage =
        CANCEL_MESSAGES[payload.cancelType] ?? CANCEL_MESSAGES.free;
      return {
        title: "Turno cancelado",
        message: `${cancelMessage}${whenLabel ? ` Fecha: ${whenLabel}.` : ""}`,
        link,
      };
    }
    case "inasistencia_turno":
      return {
        title: "Inasistencia registrada",
        message: `Se registró una inasistencia para tu turno${barberLabel}${whenLabel ? ` del ${whenLabel}` : ""}.`,
        link,
      };
    case "vale_emitido":
      return {
        title: "Vale emitido",
        message: "Recibiste un vale para tu próxima visita.",
        link,
      };
    default:
      return {
        title: "Aviso",
        message: "Tenés una novedad en tu turno.",
        link,
      };
  }
}

function toInAppDTO(notification) {
  const content = buildInAppContent(notification);
  const createdAt = notification.created_at
    ? new Date(notification.created_at).toISOString()
    : new Date().toISOString();

  return {
    id: notification._id.toString(),
    appointmentId: notification.appointment_id?.toString?.() ?? null,
    type: notification.type,
    title: content.title,
    message: content.message,
    link: content.link,
    createdAt,
    readAt: notification.read_at
      ? new Date(notification.read_at).toISOString()
      : null,
  };
}

async function countUnreadInApp(userOid) {
  return Notification.countDocuments({
    target_user_id: userOid,
    channel: "in_app",
    status: "sent",
    read_at: null,
  });
}

// Bandeja in-app del cliente autenticado.
export async function listInAppNotifications({ userId, limit = 20 }) {
  const userOid = toObjectIdOrThrow(userId, "ID de usuario inválido");
  const safeLimit =
    Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 20;
  const filter = {
    target_user_id: userOid,
    channel: "in_app",
    status: "sent",
  };

  const [items, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ created_at: -1, _id: -1 })
      .limit(safeLimit)
      .lean(),
    countUnreadInApp(userOid),
  ]);

  return {
    items: items.map(toInAppDTO),
    unread,
  };
}

// Marca un aviso como leído. Solo el dueño puede hacerlo.
export async function markInAppNotificationRead({ userId, notificationId }) {
  const userOid = toObjectIdOrThrow(userId, "ID de usuario inválido");
  const notificationOid = toObjectIdOrThrow(
    notificationId,
    "ID de notificación inválido",
  );
  const baseFilter = {
    _id: notificationOid,
    target_user_id: userOid,
    channel: "in_app",
    status: "sent",
  };

  let notification = await Notification.findOneAndUpdate(
    { ...baseFilter, read_at: null },
    { $set: { read_at: new Date() } },
    { returnDocument: "after" },
  ).lean();

  if (!notification) {
    notification = await Notification.findOne(baseFilter).lean();
  }
  if (!notification) {
    throw createAppError(404, "NOT_FOUND", "Notificación no encontrada");
  }

  return {
    notification: toInAppDTO(notification),
    unread: await countUnreadInApp(userOid),
  };
}

// Marca todos los avisos in-app del cliente como leídos.
export async function markAllInAppNotificationsRead({ userId }) {
  const userOid = toObjectIdOrThrow(userId, "ID de usuario inválido");
  const result = await Notification.updateMany(
    {
      target_user_id: userOid,
      channel: "in_app",
      status: "sent",
      read_at: null,
    },
    { $set: { read_at: new Date() } },
  );

  return {
    updated: result.modifiedCount,
    unread: 0,
  };
}

// Toma una notificación de email, la renderiza, la envía y actualiza su estado.
// Nunca propaga el error de envío: lo registra y devuelve "failed" para que
// la reserva no se vea afectada.
export async function sendNotification(notificationId) {
  const notificationOid = toObjectIdOrThrow(
    notificationId,
    "ID de notificación inválido",
  );
  const staleBefore = new Date(Date.now() - STALE_SENDING_MS);

  // Claim atómico: solo un proceso puede pasar la notificación a "sending".
  // El canal email es el único que se envía por este camino; los avisos
  // in-app ya nacen "sent".
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationOid,
      channel: "email",
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
      .select("status attempts channel")
      .lean();

    if (!existing) return { status: "skipped", reason: "not_found" };
    if (existing.channel !== "email") {
      return { status: "skipped", reason: "not_email" };
    }
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
    content = buildNotificationContent(notification);
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

// Reintenta las notificaciones de email pendientes/fallidas y las que quedaron
// colgadas en "sending". Los avisos in-app no se reintentan porque no se envían.
// `appointmentId` es opcional y permite limitar el reintento a un turno.
export async function retryPendingNotifications({
  limit = 50,
  appointmentId,
} = {}) {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 50;
  const staleBefore = new Date(Date.now() - STALE_SENDING_MS);

  const filter = {
    channel: "email",
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
