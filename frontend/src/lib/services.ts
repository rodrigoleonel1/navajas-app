import { api } from "./api";

export type Service = {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  active: boolean;
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
