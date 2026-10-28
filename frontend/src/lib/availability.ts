import { api } from "./api";

export type Slot = {
  startAt: string;
  endAt: string;
};

export type Availability = {
  barberId: string;
  date: string;
  duration: number;
  workingHours: { start: string; end: string };
  slots: Slot[];
  nextAvailable: Slot | null;
  nonWorkingDays: string[];
};

export async function getAvailability(params: {
  barberId: string;
  date: string;
  serviceIds: string[];
}): Promise<Availability> {
  // CSV y no array: axios serializa arrays como serviceIds[]=x y el
  // query parser simple de Express lo pierde (ver normalizeServiceIds).
  const res = await api.get<Availability>("/appointments/availability", {
    params: {
      barberId: params.barberId,
      date: params.date,
      serviceIds: params.serviceIds.join(","),
    },
  });
  return res.data;
}
