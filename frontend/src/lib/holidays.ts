import { api } from "./api";

export type Holiday = {
  id: string;
  date: string;
  name: string;
};

export type CreateHolidayResult = {
  holiday: Holiday;
  affectedAppointments: number;
};

export type HolidayScope = "upcoming" | "past";

export type HolidayPage = {
  items: Holiday[];
  total: number | null;
};

// Una página del listado: el total del scope llega en X-Total-Count.
export async function listHolidaysPage(params: {
  scope: HolidayScope;
  page: number;
  limit: number;
}): Promise<HolidayPage> {
  const res = await api.get<Holiday[]>("/holidays", { params });
  const total = Number(res.headers["x-total-count"]);
  return { items: res.data, total: Number.isFinite(total) ? total : null };
}

export async function createHoliday(input: {
  date: string;
  name: string;
}): Promise<CreateHolidayResult> {
  const res = await api.post<CreateHolidayResult>("/holidays", input);
  return res.data;
}

export async function updateHoliday(
  id: string,
  patch: { date?: string; name?: string },
): Promise<Holiday> {
  const res = await api.patch<Holiday>(`/holidays/${id}`, patch);
  return res.data;
}

export async function deleteHoliday(id: string): Promise<void> {
  await api.delete(`/holidays/${id}`);
}
