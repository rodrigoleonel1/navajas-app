import mongoose from "mongoose";

// RN11: oferta/descuento sobre un conjunto exacto de servicios. Puede ser un
// solo servicio (ej. 25% en corte) o una combinación (combo corte + barba).
// Las fechas son informativas para mostrarle al cliente hasta cuándo dura la
// promo; la aplicación depende exclusivamente de `active`.
const offerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    // Ordenados por _id al guardar para que la coincidencia exacta sea
    // determinista al reservar.
    service_ids: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Service",
      required: true,
      validate: {
        validator: (serviceIds) =>
          Array.isArray(serviceIds) && serviceIds.length >= 1,
        message: "Debe seleccionar al menos un servicio",
      },
    },
    discount_percent: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      validate: {
        validator: Number.isInteger,
        message: "discount_percent debe ser entero",
      },
    },
    // Fechas opcionales de la promo (informativas, no filtran la aplicación).
    valid_from: {
      type: Date,
      default: null,
    },
    valid_to: {
      type: Date,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

// Listado de ofertas vigentes y búsqueda por conjunto exacto de servicios.
offerSchema.index({ active: 1 });
offerSchema.index({ service_ids: 1, active: 1 });

export const Offer = mongoose.model("Offer", offerSchema);
