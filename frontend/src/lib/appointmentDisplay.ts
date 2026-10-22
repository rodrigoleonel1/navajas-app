import type { Appointment } from "./appointments";

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  completed: "Completado",
  cancelled: "Cancelado",
};

export const APPOINTMENT_STATUS_TONES: Record<
  string,
  "warning" | "primary" | "danger"
> = {
  pending: "warning",
  completed: "primary",
  cancelled: "danger",
};

// "Corte clásico + Barba" a partir de los servicios del turno.
export function serviceNames(services: Appointment["services"]): string {
  return services.map((service) => service.name ?? "Servicio").join(" + ");
}
