import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONES,
  serviceNames,
} from "../lib/appointmentDisplay";
import type { Appointment } from "../lib/appointments";
import { formatWeekdayDateTime } from "../lib/datetime";
import { formatPrice } from "../lib/format";
import { AppointmentMenu } from "./AppointmentMenu";
import { Badge } from "./ui/Badge";
import { ListCard } from "./ui/ListCard";

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
  // Un turno cancelado se muestra atenuado salvo el badge de estado.
  const cancelled = appointment.status === "cancelled";
  return (
    <ListCard
      title={formatWeekdayDateTime(appointment.startAt)}
      titleClassName={
        cancelled
          ? "line-through decoration-destructive decoration-2"
          : undefined
      }
      faded={cancelled}
      actions={
        <AppointmentMenu
          items={menuItems}
          busy={busy}
          ariaLabel="Acciones del turno"
        />
      }
      subtitle={`${serviceNames(appointment.services)} · ${appointment.durationSnapshot} min`}
      detail={people.length > 0 ? people.join(" · ") : undefined}
      footerLeft={formatPrice(appointment.priceSnapshot)}
      footerRight={
        <Badge tone={APPOINTMENT_STATUS_TONES[appointment.status] ?? "muted"}>
          {APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
        </Badge>
      }
    />
  );
}
