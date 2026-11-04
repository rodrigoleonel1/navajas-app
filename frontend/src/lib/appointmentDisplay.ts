import type { Appointment } from "./appointments";

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  completed: "Completado",
  cancelled: "Cancelado",
  no_show: "Inasistencia",
};

export const APPOINTMENT_STATUS_TONES: Record<
  string,
  "warning" | "primary" | "danger"
> = {
  pending: "warning",
  completed: "primary",
  cancelled: "danger",
  no_show: "danger",
};

export const CANCEL_TYPE_LABELS: Record<string, string> = {
  free: "Sin penalización",
  late: "Inasistencia registrada",
  blocked: "Inasistencia · Horario no liberado",
};

// Motivo de una cancelación automática del negocio (feriado, franco, jornada).
export const CANCEL_REASON_LABELS: Record<string, string> = {
  holiday: "Cancelado por feriado",
  day_off: "Cancelado por franco del barbero",
  weekly_day_off: "Cancelado por día no laborable",
  working_hours: "Cancelado por cambio de jornada",
};

// "Corte clásico + Barba" a partir de los servicios del turno.
export function serviceNames(services: Appointment["services"]): string {
  return services.map((service) => service.name ?? "Servicio").join(" + ");
}
