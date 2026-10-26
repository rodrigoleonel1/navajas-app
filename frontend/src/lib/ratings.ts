import { api } from "./api";

export type RatingResult = {
  appointmentId: string;
  barberId: string;
  score: number;
  ratedAt: string;
};

// EP-7 / CA-21: el cliente califica un turno propio ya completado.
export async function createRating(input: {
  appointmentId: string;
  score: number;
}): Promise<RatingResult> {
  const res = await api.post<RatingResult>("/ratings", input);
  return res.data;
}

// Promedio con 1 decimal; sin calificaciones no hay número que mostrar.
export function formatRatingAverage(average: number | null | undefined): string {
  return average == null ? "Sin calificaciones" : average.toFixed(1);
}
