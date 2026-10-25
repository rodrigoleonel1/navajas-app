import mongoose from "mongoose";

// Punto de serialización por barbero para reservas concurrentes.
// No representa "bloqueado": la transacción incrementa `version` y MongoDB
// fuerza el conflicto de escritura si dos reservas del mismo barbero se pisan.
const bookingLockSchema = new mongoose.Schema(
  {
    barber_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    version: {
      type: Number,
      default: 0,
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Un solo documento por barbero: sin este índice el lock no serializa nada.
bookingLockSchema.index({ barber_id: 1 }, { unique: true });

export const BookingLock = mongoose.model("BookingLock", bookingLockSchema);
