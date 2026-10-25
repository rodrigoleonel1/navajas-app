import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  limit: z.coerce
    .number({ message: "Límite inválido" })
    .int("Límite inválido")
    .min(1, "El límite mínimo es 1")
    .max(50, "El límite máximo es 50")
    .default(20),
});
