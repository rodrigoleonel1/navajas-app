import { z } from "zod";

// Hora en formato HH:MM de 24h (ej: "09:00", "18:30").
const workHour = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida, use HH:MM");

// PATCH /barbers/:id: jornada, francos puntuales y/o semanales, todo opcional.
// daysOff son días calendario YYYY-MM-DD (se guardan como Date UTC 00:00).
// weeklyDaysOff son días de semana recurrentes: 0=domingo ... 6=sábado.
export const updateBarberProfileSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  workingHours: z
    .object({ start: workHour, end: workHour })
    .partial()
    .optional(),
  daysOff: z.array(z.iso.date("Fecha inválida, use YYYY-MM-DD")).optional(),
  weeklyDaysOff: z.array(z.number().int().min(0).max(6)).optional(),
}).refine(
  (data) => {
    const { start, end } = data.workingHours ?? {};
    if (start && end) return start < end;
    return true;
  },
  { message: "La salida debe ser posterior a la entrada", path: ["workingHours"] },
);
