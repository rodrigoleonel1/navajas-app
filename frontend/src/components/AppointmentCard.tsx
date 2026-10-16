import { formatWeekdayDateTime } from "../lib/datetime";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONES,
} from "../lib/appointmentDisplay";
import type { Appointment } from "../lib/appointments";
import { Badge } from "./ui/Badge";
import { AppointmentMenu } from "./AppointmentMenu";

const STATUS_GRADIENTS: Record<string, string> = {
  pending: "linear-gradient(180deg, rgba(34,211,238,0.16), transparent 70%)",
  completed: "linear-gradient(180deg, rgba(96,165,250,0.16), transparent 70%)",
  cancelled: "linear-gradient(180deg, rgba(239,68,68,0.12), transparent 70%)",
};

export function AppointmentCard({
  appointment,
  hideBarber = false,
  hideClient = false,
  onComplete,
  onCancel,
  onViewDetail,
  busy = false,
}: {
  appointment: Appointment;
  hideBarber?: boolean;
  hideClient?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
  onViewDetail?: () => void;
  busy?: boolean;
}) {
  const serviceNames = appointment.services
    .map((service) => service.name ?? "Servicio")
    .join(" + ");
  const people = [
    !hideBarber && appointment.barber.name
      ? `Barbero: ${appointment.barber.name}`
      : null,
    !hideClient && appointment.client.name
      ? `Cliente: ${appointment.client.name}`
      : null,
  ].filter(Boolean);
  const menuItems = [
    ...(onViewDetail
      ? [{ label: "Ver detalle", onSelect: onViewDetail }]
      : []),
    ...(onComplete
      ? [{ label: "Completar turno", onSelect: onComplete }]
      : []),
    ...(onCancel
      ? [{ label: "Cancelar turno", danger: true, onSelect: onCancel }]
      : []),
  ];
  return (
    <li
      className="rounded-xl border border-border bg-background/40 bg-clip-padding-box px-4 py-3 flex flex-col"
      style={{ backgroundImage: STATUS_GRADIENTS[appointment.status] }}
    >
      <span className="flex justify-between items-center gap-2">
        <span className="font-barlow font-bold text-2xl leading-none">
          {formatWeekdayDateTime(appointment.startAt)}
        </span>
        <AppointmentMenu
          items={menuItems}
          busy={busy}
          ariaLabel="Acciones del turno"
        />
      </span>
      <span className="mt-1 text-sm font-semibold">
        {serviceNames} · {appointment.durationSnapshot} min
      </span>
      {people.length > 0 && (
        <span className="text-sm text-muted">{people.join(" · ")}</span>
      )}
      <span className="mt-auto pt-2 flex items-end justify-between gap-2">
        <span className="text-lg font-semibold">
          ${appointment.priceSnapshot.toLocaleString("es-AR")}
        </span>
        <Badge tone={APPOINTMENT_STATUS_TONES[appointment.status] ?? "muted"}>
          {APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
        </Badge>
      </span>
    </li>
  );
}
