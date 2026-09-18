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
