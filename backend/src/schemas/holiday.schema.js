import { z } from "zod";

// Fecha calendario del feriado (YYYY-MM-DD). Se normaliza a UTC 00:00 en el
// service para que no dependa de la zona horaria del servidor.
export const createHolidaySchema = z.object({
  date: z.iso.date("Fecha inválida, use YYYY-MM-DD"),
  name: z
    .string()
    .trim()
    .min(2, "Nombre mínimo 2 caracteres")
    .max(80, "Nombre máximo 80 caracteres"),
});

export const updateHolidaySchema = createHolidaySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nada para actualizar",
  });
