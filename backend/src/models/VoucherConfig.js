import mongoose from "mongoose";

// Configuración simple de vales. Es un singleton (key: "default").
const voucherConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default",
    },
    // Días de vigencia del vale emitido por cancelación del admin (RN7).
    admin_cancellation_days: {
      type: Number,
      required: true,
      default: 30,
      min: 1,
      max: 365,
    },
    // Días de vigencia del vale de fidelidad cada 10 turnos (RN8).
    fidelity_days: {
      type: Number,
      required: true,
      default: 30,
      min: 1,
      max: 365,
    },
  },
  {
    collection: "voucher_configs",
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

export const VoucherConfig = mongoose.model(
  "VoucherConfig",
  voucherConfigSchema,
);
