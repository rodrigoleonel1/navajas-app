import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");

export const createAppointmentSchema = z.object({
  serviceIds: z.array(objectId).min(1, "Debe seleccionar al menos un servicio"),
  barberId: objectId,
  startAt: z.iso.datetime({ message: "Fecha inválida, use ISO8601 UTC" }),
});

export const listAppointmentsQuerySchema = z.object({
  barberId: objectId.optional(),
  date: z.iso.datetime().optional(),
  status: z.enum(["pending", "completed", "cancelled"]).optional(),
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
