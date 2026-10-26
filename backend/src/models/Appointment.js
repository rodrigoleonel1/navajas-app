import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    barber_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    service_ids: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Service",
      required: true,
      validate: {
        validator: (serviceIds) => Array.isArray(serviceIds) && serviceIds.length >= 1,
        message: "Debe seleccionar al menos un servicio",
      },
    },
    start_at: {
      type: Date,
      required: true,
    },
    end_at: {
      type: Date,
      required: true,
      validate: {
        validator: function (endAt) {
          return !this.start_at || endAt > this.start_at;
        },
        message: "end_at debe ser posterior a start_at",
      },
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled", "no_show"],
      default: "pending",
      required: true,
    },
    // RN3: solo aplica a turnos cancelados.
    // free: libera y no cuenta; late: libera y cuenta; blocked: no libera y cuenta.
    cancel_type: {
      type: String,
      enum: ["free", "late", "blocked"],
    },
    // RN5: la inasistencia ya se usó para aplicar el recargo del 20%.
    penalty_used: {
      type: Boolean,
      default: false,
    },
    // Monto del recargo aplicado a esta reserva (0 si no hubo recargo).
    extra: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Precio histórico real cobrado (inmutable tras cambios Service).
    // Incluye el recargo RN5 y descuenta la oferta RN11 y el vale, si hubo.
    price_snapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    // Vale aplicado a esta reserva (como máximo uno) y descuento en pesos.
    voucher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      default: null,
    },
    voucher_discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // RN11: oferta/combo aplicado a esta reserva y descuento en pesos.
    offer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      default: null,
    },
    offer_discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Duración histórica en min (inmutable)
    duration_snapshot: {
      type: Number,
      required: true,
      min: 1,
    },
    // EP-7 / CA-21: calificación del cliente (1 a 5 estrellas).
    // Inmutable: se setea una sola vez y no se edita ni se borra.
    rating: {
      type: Number,
      default: null,
      min: 1,
      max: 5,
    },
    rated_at: {
      type: Date,
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

// Disponibilidad: barbero + ventana + estado
appointmentSchema.index({ barber_id: 1, start_at: 1, end_at: 1, status: 1 });
// Historial cliente ordenado
appointmentSchema.index({ client_id: 1, start_at: 1 });
// RN5: inasistencias del cliente todavía no usadas para el recargo
appointmentSchema.index({ client_id: 1, penalty_used: 1, start_at: 1 });
// Rango temporal general 
appointmentSchema.index({ start_at: 1 });
// EP-7: promedio de calificaciones por barbero (turnos completados y calificados)
appointmentSchema.index({ barber_id: 1, status: 1, rating: 1 });

export const Appointment = mongoose.model("Appointment", appointmentSchema);
