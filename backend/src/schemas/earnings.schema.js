import { z } from "zod";

const dayKey = z.iso.date({ message: "Fecha inválida, use YYYY-MM-DD" });

function daysBetween(from, to) {
  return Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) -
      Date.parse(`${from}T00:00:00.000Z`)) /
      (24 * 60 * 60 * 1000),
  );
}

export const earningsQuerySchema = z
  .object({
    from: dayKey,
    to: dayKey,
  })
  .refine((data) => data.from <= data.to, {
    message: "El rango de fechas es inválido",
    path: ["to"],
  })
  .refine((data) => daysBetween(data.from, data.to) < 366, {
    message: "El rango máximo es de 366 días",
    path: ["to"],
  });

export const dailyEarningsQuerySchema = z.object({
  date: dayKey,
});
