import { api } from "./api";

export type Barber = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  barberProfile?: {
    workingHours?: { start?: string; end?: string };
    daysOff?: string[];
    weeklyDaysOff?: number[];
  };
  // EP-7: promedio interno, solo lo devuelve el backend al admin.
  ratingAverage?: number | null;
  ratingCount?: number;
};

export async function listBarbers(
  includeInactive = false,
): Promise<Barber[]> {
  const res = await api.get<Barber[]>("/barbers", {
    params: includeInactive ? { all: "1" } : {},
  });
  return res.data;
}

export async function getBarberById(id: string): Promise<Barber> {
  const res = await api.get<Barber>(`/barbers/${id}`);
  return res.data;
}

export async function updateBarberProfile(
  id: string,
  patch: {
    name?: string;
    workingHours?: { start?: string; end?: string };
    daysOff?: string[];
    weeklyDaysOff?: number[];
    active?: boolean;
  },
): Promise<Barber> {
  const res = await api.patch<Barber>(`/barbers/${id}`, patch);
  return res.data;
}
