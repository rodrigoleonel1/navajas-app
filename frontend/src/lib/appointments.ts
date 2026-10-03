import { api } from "./api";

export type Service = {
  id: string;
  name: string;
  duration: number;
  price: number;
  active: boolean;
};

export type Barber = {
  id: string;
  name: string;
  email: string;
  role: string;
  barberProfile?: {
    workingHours?: { start?: string; end?: string };
    daysOff?: string[];
    weeklyDaysOff?: number[];
  };
};

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

export type Appointment = {
  id: string;
  barber: { id: string; name?: string };
  client: { id: string; name?: string };
  services: { id: string; name?: string; price?: number; duration?: number }[];
  startAt: string;
  endAt: string;
  status: string;
  priceSnapshot: number;
  durationSnapshot: number;
};

export async function listServices(
  includeInactive = false,
): Promise<Service[]> {
  const res = await api.get<Service[]>("/services", {
    params: includeInactive ? { all: "1" } : {},
  });
  return res.data;
}

export async function getServiceById(id: string): Promise<Service> {
  const res = await api.get<Service>(`/services/${id}`);
  return res.data;
}

export async function updateService(
  id: string,
  patch: { name?: string; duration?: number; price?: number; active?: boolean },
): Promise<Service> {
  const res = await api.patch<Service>(`/services/${id}`, patch);
  return res.data;
}

export async function listBarbers(): Promise<Barber[]> {
  const res = await api.get<Barber[]>("/barbers");
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
  },
): Promise<Barber> {
  const res = await api.patch<Barber>(`/barbers/${id}`, patch);
  return res.data;
}

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

export async function createAppointment(input: {
  barberId: string;
  serviceIds: string[];
  startAt: string;
}): Promise<Appointment> {
  const res = await api.post<Appointment>("/appointments", input);
  return res.data;
}

export function getConflictSuggestion(err: unknown): string | null {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: unknown }).response === "object"
  ) {
    const data = (err as { response?: { data?: unknown } }).response?.data as
      | { error?: { details?: { suggestedStartAt?: string } } }
      | undefined;
    return data?.error?.details?.suggestedStartAt ?? null;
  }
  return null;
}
