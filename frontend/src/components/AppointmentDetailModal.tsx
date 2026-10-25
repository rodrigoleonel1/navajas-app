import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONES,
  CANCEL_TYPE_LABELS,
  serviceNames,
} from "../lib/appointmentDisplay";
import type { Appointment } from "../lib/appointments";
import { formatHour, formatWeekdayDate } from "../lib/datetime";
import { formatPrice } from "../lib/format";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

export function AppointmentDetailModal({
  appointment,
  onClose,
  onComplete,
  onCancel,
  onNoShow,
  busy = false,
}: {
  appointment: Appointment;
  onClose: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onNoShow?: () => void;
  busy?: boolean;
}) {
  const people = [
    appointment.barber.name ? `Barbero: ${appointment.barber.name}` : null,
    appointment.client.name ? `Cliente: ${appointment.client.name}` : null,
  ].filter(Boolean);
  const extra = appointment.extra ?? 0;
  const basePrice = Math.max(appointment.priceSnapshot - extra, 0);
  const statusNote =
    appointment.status === "cancelled" && appointment.cancelType
      ? CANCEL_TYPE_LABELS[appointment.cancelType]
      : appointment.status === "no_show"
        ? "Horario no liberado"
        : null;
  return (
    <Modal title="Detalle del turno" onClose={onClose}>
      <div className="text-center">
        <p className="font-barlow font-bold text-3xl leading-none">
          {formatWeekdayDate(appointment.startAt)}
        </p>
        <p className="text-sm text-muted">
          {formatHour(appointment.startAt)} hs ·{" "}
          {appointment.durationSnapshot} min
        </p>
        <div className="my-3 border-t border-dashed border-border" />
        <p className="text-sm font-semibold">
          {serviceNames(appointment.services)}
        </p>
        {people.length > 0 && (
          <p className="text-sm text-muted">{people.join(" · ")}</p>
        )}
        <div className="my-3 border-t border-dashed border-border" />
        <div className="flex items-center justify-center gap-3">
          <p className="font-barlow font-bold text-3xl">
            {formatPrice(appointment.priceSnapshot)}
          </p>
          <Badge
            tone={APPOINTMENT_STATUS_TONES[appointment.status] ?? "muted"}
          >
            {APPOINTMENT_STATUS_LABELS[appointment.status] ??
              appointment.status}
          </Badge>
        </div>
        {extra > 0 && (
          <p className="mt-1 text-xs text-muted">
            Precio base {formatPrice(basePrice)} · Recargo 20%{" "}
            {formatPrice(extra)}
          </p>
        )}
        {statusNote && (
          <p className="mt-2 text-xs text-muted">{statusNote}</p>
        )}
      </div>
      {(onComplete || onCancel || onNoShow) && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {onComplete && (
            <Button
              variant="primaryBlock"
              className="flex-1"
              disabled={busy}
              onClick={onComplete}
            >
              Completar
            </Button>
          )}
          {onNoShow && (
            <Button
              variant="danger"
              className="flex-1"
              disabled={busy}
              onClick={onNoShow}
            >
              Inasistencia
            </Button>
          )}
          {onCancel && (
            <Button
              variant="danger"
              className="flex-1"
              disabled={busy}
              onClick={onCancel}
            >
              Cancelar
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}
