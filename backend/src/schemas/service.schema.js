import { z } from "zod";

export const createServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nombre mínimo 2 caracteres")
    .max(50, "Nombre máximo 50 caracteres"),
  description: z
    .string({ error: "Descripción requerida" })
    .trim()
    .min(2, "Descripción mínimo 2 caracteres")
    .max(120, "Descripción máximo 120 caracteres"),
  duration: z
    .number()
    .int("Duración debe ser entera")
    .positive("Duración debe ser mayor a 0"),
  price: z.number().positive("Precio debe ser mayor a 0"),
});

// Para PATCH: mismos campos opcionales, mismas validaciones + active
// (permite reactivar un servicio desactivado con { active: true })
export const updateServiceSchema = createServiceSchema
  .partial()
  .extend({ active: z.boolean().optional() });

// Landing pública: cantidad de servicios más pedidos a devolver.
export const listPopularServicesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(3),
});

