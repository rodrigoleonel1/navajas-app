import { z } from "zod";

// El admin solo configura la duración. El descuento del vale de RN7 es fijo.
export const updateVoucherConfigSchema = z.object({
  adminCancellationDays: z.coerce
    .number()
    .int("La duración debe ser un número entero")
    .min(1, "La duración mínima es 1 día")
    .max(365, "La duración máxima es 365 días"),
});
