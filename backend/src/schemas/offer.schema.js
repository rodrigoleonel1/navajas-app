import { z } from "zod";

const offerFields = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nombre mínimo 2 caracteres")
    .max(50, "Nombre máximo 50 caracteres"),
  serviceIds: z
    .array(z.string().min(1, "ID de servicio inválido"))
    .min(1, "Seleccioná al menos un servicio"),
  discountPercent: z.coerce
    .number()
    .int("El descuento debe ser un número entero")
    .min(1, "El descuento mínimo es 1%")
    .max(100, "El descuento máximo es 100%"),
  // Fechas informativas de la promo. No filtran la aplicación.
  validFrom: z.iso.date("Fecha inválida, use YYYY-MM-DD").nullable().optional(),
  validTo: z.iso.date("Fecha inválida, use YYYY-MM-DD").nullable().optional(),
  active: z.boolean().optional(),
});

function assertDateOrder(data) {
  if (data.validFrom && data.validTo && data.validTo < data.validFrom) {
    return false;
  }
  return true;
}

const DATE_ORDER_MESSAGE = {
  path: ["validTo"],
  message: "La fecha de fin no puede ser anterior a la de inicio",
};

export const createOfferSchema = offerFields.refine(
  assertDateOrder,
  DATE_ORDER_MESSAGE,
);

export const updateOfferSchema = offerFields
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nada para actualizar",
  })
  .refine(assertDateOrder, DATE_ORDER_MESSAGE);
