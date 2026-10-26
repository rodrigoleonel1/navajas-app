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

// Paginación opcional: sin limit devuelve todos los feriados del scope.
// `scope` separa próximos (desde hoy) de pasados usando el día comercial.
export const listHolidaysQuerySchema = z
  .object({
    scope: z
      .enum(["upcoming", "past"], { message: "Scope inválido" })
      .optional(),
    limit: z.coerce
      .number({ message: "Límite inválido" })
      .int("Límite inválido")
      .min(1, "El límite mínimo es 1")
      .max(100, "El límite máximo es 100")
      .optional(),
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
