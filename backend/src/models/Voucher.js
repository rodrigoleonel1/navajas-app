import mongoose from "mongoose";

// Origen del vale. RN7 emite por cancelación del admin; RN8 usará fidelidad.
export const VOUCHER_SOURCES = ["admin_cancellation", "fidelity"];

const voucherSchema = new mongoose.Schema(
  {
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    source: {
      type: String,
      enum: VOUCHER_SOURCES,
      required: true,
    },
    // Turno que originó el vale (por ejemplo, el turno cancelado por el admin).
    source_appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },
    discount_percent: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    issued_at: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expires_at: {
      type: Date,
      required: true,
      validate: {
        validator: function (expiresAt) {
          return !this.issued_at || expiresAt > this.issued_at;
        },
        message: "expires_at debe ser posterior a issued_at",
      },
    },
    // Se completa cuando el vale se aplica a una reserva.
    used_at: {
      type: Date,
      default: null,
    },
    used_appointment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Listado del cliente y detección de vales vigentes.
voucherSchema.index({ client_id: 1, expires_at: 1 });
// Un solo vale del mismo origen por turno (idempotencia de RN7/RN8).
voucherSchema.index(
  { source_appointment_id: 1, source: 1 },
  { unique: true },
);
// Búsqueda del próximo vale a aplicar: cliente + no usado + vigencia.
voucherSchema.index({ client_id: 1, used_at: 1, expires_at: 1 });

export const Voucher = mongoose.model("Voucher", voucherSchema);
