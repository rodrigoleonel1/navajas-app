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

export async function listHolidays(): Promise<Holiday[]> {
  const res = await api.get<Holiday[]>("/holidays");
  return res.data;
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
