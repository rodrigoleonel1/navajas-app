import type { ReactNode } from "react";
import { formatDayHour } from "../lib/datetime";
import type { Appointment } from "../lib/appointments";
import { Badge } from "./ui/Badge";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  completed: "Completado",
  cancelled: "Cancelado",
};

export function AppointmentRow({
  appointment,
  hideBarber = false,
  hideClient = false,
  actions,
}: {
  appointment: Appointment;
  hideBarber?: boolean;
  hideClient?: boolean;
  actions?: ReactNode;
}) {
  const serviceNames = appointment.services
    .map((service) => service.name ?? "Servicio")
    .join(" + ");
  return (
    <li className="flex flex-col gap-1 border border-border rounded-lg px-3 py-2">
      <span className="flex justify-between items-center gap-2">
        <span className="text-sm font-medium">
          {formatDayHour(appointment.startAt)}
        </span>
        <Badge>{STATUS_LABELS[appointment.status] ?? appointment.status}</Badge>
      </span>
      <span className="text-xs text-muted">
        {serviceNames} — {appointment.durationSnapshot} min — $
        {appointment.priceSnapshot.toLocaleString("es-AR")}
      </span>
      {!hideBarber && appointment.barber.name && (
        <span className="text-xs text-muted">
          Barbero: {appointment.barber.name}
        </span>
      )}
      {!hideClient && appointment.client.name && (
        <span className="text-xs text-muted">
          Cliente: {appointment.client.name}
        </span>
      )}
      {actions && <span className="mt-1 flex gap-2">{actions}</span>}
    </li>
  );
}
