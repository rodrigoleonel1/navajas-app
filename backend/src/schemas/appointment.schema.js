import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");

export const createAppointmentSchema = z.object({
  serviceIds: z.array(objectId).min(1, "Debe seleccionar al menos un servicio"),
  barberId: objectId,
  startAt: z.iso.datetime({ message: "Fecha inválida, use ISO8601 UTC" }),
});

// El admin puede completar o cancelar un turno pendiente.
// La inasistencia (no_show) se marca por el endpoint dedicado, que valida
// la tolerancia de 15 minutos de RN4.
export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["completed", "cancelled"]),
});

export const listAppointmentsQuerySchema = z
  .object({
    barberId: objectId.optional(),
    date: z
      .union([z.iso.date(), z.iso.datetime()], {
        message: "Fecha inválida, use YYYY-MM-DD o ISO8601 UTC",
      })
      .optional(),
    status: z
      .enum(["pending", "completed", "cancelled", "no_show"])
      .optional(),
    // Paginación opcional: sin limit no hay tope (así siguen admin y barbero,
    // que ya están acotados por día). El cursor es el start_at del último item.
    limit: z.coerce
      .number({ message: "Límite inválido" })
      .int("Límite inválido")
      .min(1, "El límite mínimo es 1")
      .max(100, "El límite máximo es 100")
      .optional(),
    cursor: z.iso
      .datetime({ message: "Cursor inválido, use ISO8601 UTC" })
      .optional(),
    order: z.enum(["asc", "desc"], { message: "Orden inválido" }).optional(),
    page: z.coerce
      .number({ message: "Página inválida" })
      .int("Página inválida")
      .min(1, "La página mínima es 1")
      .optional(),
  })
  .refine((data) => !data.page || data.limit, {
    message: "La página necesita un límite de resultados",
    path: ["page"],
  });

// Normaliza ?serviceIds=a,b,c | ?serviceIds=a&serviceIds=b | ?serviceIds[]=a a string[].
function normalizeServiceIds(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      typeof item === "string"
        ? item
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
        : [],
    );
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return value;
}

export const availabilityQuerySchema = z
  .object({
    barberId: objectId,
    date: z.union([z.iso.date(), z.iso.datetime()], {
      message: "Fecha inválida, use YYYY-MM-DD o ISO8601 UTC",
    }),
    serviceIds: z.preprocess(
      normalizeServiceIds,
      z.array(objectId).min(1, "Debe seleccionar al menos un servicio").optional(),
    ),
    durationMinutes: z.coerce.number().int().min(1).max(1440).optional(),
    step: z.coerce.number().int().min(5).max(120).default(30),
    horizonDays: z.coerce.number().int().min(1).max(30).default(14),
  })
  .refine((data) => data.serviceIds ?? data.durationMinutes, {
    message: "Debe enviar serviceIds o durationMinutes",
    path: ["serviceIds"],
  });
