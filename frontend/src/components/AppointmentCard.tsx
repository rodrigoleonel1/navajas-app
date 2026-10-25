import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONES,
  CANCEL_TYPE_LABELS,
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
  onNoShow,
  onViewDetail,
  busy = false,
}: {
  appointment: Appointment;
  hideBarber?: boolean;
  hideClient?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
  onNoShow?: () => void;
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
    ...(onNoShow
      ? [
          {
            label: "Marcar inasistencia",
            danger: true,
            onSelect: onNoShow,
          },
        ]
      : []),
    ...(onCancel
      ? [{ label: "Cancelar turno", danger: true, onSelect: onCancel }]
      : []),
  ];
  const notes = [
    appointment.status === "cancelled" && appointment.cancelType
      ? CANCEL_TYPE_LABELS[appointment.cancelType]
      : null,
    appointment.status === "no_show" ? "Horario no liberado" : null,
    appointment.extra > 0 ? "Incluye recargo del 20%" : null,
  ].filter(Boolean);
  const detail = [...people, ...notes].join(" · ");
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
      detail={detail || undefined}
      footerLeft={formatPrice(appointment.priceSnapshot)}
      footerRight={
        <Badge tone={APPOINTMENT_STATUS_TONES[appointment.status] ?? "muted"}>
          {APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
        </Badge>
      }
    />
  );
}
