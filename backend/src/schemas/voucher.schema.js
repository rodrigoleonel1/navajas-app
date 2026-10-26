import { z } from "zod";

// El admin configura la duración de cada tipo de vale. Los descuentos son
// fijos: 20% por cancelación del admin (RN7) y 30% por fidelidad (RN8).
export const updateVoucherConfigSchema = z.object({
  adminCancellationDays: z.coerce
    .number()
    .int("La duración debe ser un número entero")
    .min(1, "La duración mínima es 1 día")
    .max(365, "La duración máxima es 365 días"),
  fidelityDays: z.coerce
    .number()
    .int("La duración debe ser un número entero")
    .min(1, "La duración mínima es 1 día")
    .max(365, "La duración máxima es 365 días"),
});
