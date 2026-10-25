import mongoose from "mongoose";

// Feriado global del negocio. Se guarda como fecha calendario UTC 00:00 y
// aplica a todos los barberos, incluidos los que se creen después.
const holidaySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Una sola definición por fecha: evita duplicados y acelera la consulta
// de disponibilidad por rango.
holidaySchema.index({ date: 1 }, { unique: true });

export const Holiday = mongoose.model("Holiday", holidaySchema);
