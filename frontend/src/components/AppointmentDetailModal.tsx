import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONES,
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
  busy = false,
}: {
  appointment: Appointment;
  onClose: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  const people = [
    appointment.barber.name ? `Barbero: ${appointment.barber.name}` : null,
    appointment.client.name ? `Cliente: ${appointment.client.name}` : null,
  ].filter(Boolean);
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
      </div>
      {(onComplete || onCancel) && (
        <div className="mt-6 flex gap-2">
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
