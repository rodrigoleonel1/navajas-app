import { z } from "zod";

export const createServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nombre mínimo 2 caracteres")
    .max(50, "Nombre máximo 50 caracteres"),
  duration: z
    .number()
    .int("Duración debe ser entera")
    .positive("Duración debe ser mayor a 0"),
  price: z.number().positive("Precio debe ser mayor a 0"),
});

// Para PATCH: mismos campos opcionales, mismas validaciones
export const updateServiceSchema = createServiceSchema.partial();
