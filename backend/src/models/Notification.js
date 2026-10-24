import mongoose from "mongoose";

// Canales soportados. `in_app` queda preparado para V2.
export const NOTIFICATION_CHANNELS = ["email", "in_app"];

// Tipos de notificación (template/contenido).
export const NOTIFICATION_TYPES = [
  "confirmacion_turno",
  "cancelacion_turno",
  "inasistencia_turno",
  "recordatorio_turno",
  "vale_emitido",
];

export const NOTIFICATION_STATUSES = ["pending", "sending", "sent", "failed"];

const notificationSchema = new mongoose.Schema(
  {
    appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    target_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    target_email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: NOTIFICATION_CHANNELS,
      required: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    status: {
      type: String,
      enum: NOTIFICATION_STATUSES,
      default: "pending",
      required: true,
    },
    // Snapshot de los datos usados para renderizar el email.
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    last_error: {
      code: { type: String },
      message: { type: String },
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Idempotencia: un solo registro por turno + tipo + canal.
notificationSchema.index(
  { appointment_id: 1, type: 1, channel: 1 },
  { unique: true },
);
// Reintentos: pendientes/fallidas ordenadas por antigüedad.
notificationSchema.index({ status: 1, attempts: 1, created_at: 1 });
// Recuperar notificaciones que quedaron en "sending".
notificationSchema.index({ status: 1, updated_at: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
