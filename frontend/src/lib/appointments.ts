import { api } from "./api";

export type Service = {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  active: boolean;
};

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

export type Slot = {
  startAt: string;
  endAt: string;
};

export type CancelType = "free" | "late" | "blocked";

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
  cancelType: CancelType | null;
  extra: number;
  priceSnapshot: number;
  voucherId: string | null;
  voucherDiscount: number;
  offerId: string | null;
  offer: { id: string; name: string; discountPercent: number } | null;
  offerDiscount: number;
  durationSnapshot: number;
  // EP-7: nota del cliente (1–5) e instante en que la dejó.
  rating: number | null;
  ratedAt: string | null;
};

export async function listServices(
  includeInactive = false,
): Promise<Service[]> {
  const res = await api.get<Service[]>("/services", {
    params: includeInactive ? { all: "1" } : {},
  });
  return res.data;
}

// Landing pública: servicios activos ordenados por cantidad de turnos.
export async function listPopularServices(limit = 3): Promise<Service[]> {
  const res = await api.get<Service[]>("/services/popular", {
    params: { limit },
  });
  return res.data;
}

export async function getServiceById(id: string): Promise<Service> {
  const res = await api.get<Service>(`/services/${id}`);
  return res.data;
}

export async function updateService(
  id: string,
  patch: {
    name?: string;
    description?: string;
    duration?: number;
    price?: number;
    active?: boolean;
  },
): Promise<Service> {
  const res = await api.patch<Service>(`/services/${id}`, patch);
  return res.data;
}

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

export type AppointmentListParams = {
  barberId?: string;
  date?: string;
  status?: string;
  limit?: number;
  cursor?: string;
  order?: "asc" | "desc";
  page?: number;
};

function getAppointments(params: AppointmentListParams) {
  return api.get<Appointment[]>("/appointments", { params });
}

// Sin limit devuelve todo el filtro (admin y barbero listan el día completo).
export async function listAppointments(
  params?: AppointmentListParams,
): Promise<Appointment[]> {
  const res = await getAppointments(params ?? {});
  return res.data;
}

// Una página del listado: el total del filtro llega en X-Total-Count.
export async function listAppointmentsPage(params: {
  page: number;
  limit: number;
  order?: "asc" | "desc";
  barberId?: string;
  status?: string;
  cursor?: string;
}): Promise<{ items: Appointment[]; total: number | null }> {
  const res = await getAppointments(params);
  const total = Number(res.headers["x-total-count"]);
  return { items: res.data, total: Number.isFinite(total) ? total : null };
}

// Historial del cliente: los turnos anteriores a `before`, más nuevos primero.
export async function listAppointmentHistory(params: {
  before: string;
  page: number;
  limit: number;
}): Promise<{ items: Appointment[]; total: number | null }> {
  return listAppointmentsPage({
    cursor: params.before,
    order: "desc",
    page: params.page,
    limit: params.limit,
  });
}

export async function updateAppointmentStatus(
  id: string,
  status: "completed" | "cancelled",
): Promise<Appointment> {
  const res = await api.patch<Appointment>(`/appointments/${id}`, { status });
  return res.data;
}

export async function cancelAppointment(id: string): Promise<Appointment> {
  const res = await api.patch<Appointment>(`/appointments/${id}/cancel`);
  return res.data;
}

export async function markNoShow(id: string): Promise<Appointment> {
  const res = await api.patch<Appointment>(`/appointments/${id}/no-show`);
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
