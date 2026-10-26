import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "ID inválido");

export const createRatingSchema = z.object({
  appointmentId: objectId,
  score: z
    .number({ message: "La calificación debe ser un número" })
    .int("La calificación debe ser un número entero")
    .min(1, "La calificación mínima es 1 estrella")
    .max(5, "La calificación máxima es 5 estrellas"),
});
