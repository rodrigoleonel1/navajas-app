import mongoose from "mongoose";

// Punto de serialización por cliente para evitar que reserve dos turnos
// superpuestos con barberos distintos al mismo tiempo. Igual que BookingLock,
// no representa "bloqueado": la transacción incrementa `version` y MongoDB
// fuerza el conflicto de escritura si dos reservas del mismo cliente se pisan.
const clientBookingLockSchema = new mongoose.Schema(
  {
    client_id: {
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

// Un solo documento por cliente: sin este índice el lock no serializa nada.
clientBookingLockSchema.index({ client_id: 1 }, { unique: true });

export const ClientBookingLock = mongoose.model(
  "ClientBookingLock",
  clientBookingLockSchema,
);
