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
