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
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
      required: true,
    },
    // Precio histórico real cobrado (inmutable tras cambios Service)
    price_snapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    // Duración histórica en min (inmutable)
    duration_snapshot: {
      type: Number,
      required: true,
      min: 1,
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
// Rango temporal general 
appointmentSchema.index({ start_at: 1 });

export const Appointment = mongoose.model("Appointment", appointmentSchema);
