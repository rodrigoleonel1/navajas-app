import mongoose from "mongoose";

// Canales soportados: email transaccional y aviso dentro de la app.
export const NOTIFICATION_CHANNELS = ["email", "in_app"];

// Tipos de notificación (template/contenido).
export const NOTIFICATION_TYPES = [
  "confirmacion_turno",
  "cancelacion_turno",
  "inasistencia_turno",
  "recordatorio_turno",
  "vale_emitido",
  // Avisos internos para el barbero y los admins (solo canal in_app).
  "nuevo_turno_staff",
  "cancelacion_turno_staff",
  "inasistencia_turno_staff",
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
    // Solo para canal in_app: momento en que el cliente abrió el aviso.
    read_at: {
      type: Date,
      default: null,
    },
    // Snapshot de los datos usados para renderizar el email o el aviso.
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

// Idempotencia: un solo registro por turno + tipo + canal + destinatario.
notificationSchema.index(
  { appointment_id: 1, type: 1, channel: 1, target_user_id: 1 },
  { unique: true },
);
// Bandeja in-app: últimos avisos del cliente.
notificationSchema.index({
  target_user_id: 1,
  channel: 1,
  status: 1,
  created_at: -1,
});
// Contador de avisos in-app no leídos.
notificationSchema.index({
  target_user_id: 1,
  channel: 1,
  status: 1,
  read_at: 1,
});

export const Notification = mongoose.model("Notification", notificationSchema);
