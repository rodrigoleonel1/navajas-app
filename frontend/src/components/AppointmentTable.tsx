import type { ReactNode } from "react";
import { formatDayHour } from "../lib/datetime";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONES,
} from "../lib/appointmentDisplay";
import type { Appointment } from "../lib/appointments";
import { Badge } from "./ui/Badge";

export function AppointmentTable({
  appointments,
  onSelect,
  renderActions,
}: {
  appointments: Appointment[];
  onSelect: (appointment: Appointment) => void;
  renderActions: (appointment: Appointment) => ReactNode;
}) {
  return (
    <div className="hidden lg:block overflow-hidden rounded-xl border border-border bg-background">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted">
            <th className="px-4 py-3 font-semibold">Fecha</th>
            <th className="px-4 py-3 font-semibold">Servicio</th>
            <th className="px-4 py-3 font-semibold">Barbero</th>
            <th className="px-4 py-3 font-semibold">Cliente</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => {
            const serviceNames = appointment.services
              .map((service) => service.name ?? "Servicio")
              .join(" + ");
            return (
              <tr
                key={appointment.id}
                onClick={() => onSelect(appointment)}
                className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-primary/5"
              >
                <td className="px-4 py-3 font-medium whitespace-nowrap">
                  {formatDayHour(appointment.startAt)}
                </td>
                <td className="px-4 py-3">{serviceNames}</td>
                <td className="px-4 py-3">
                  {appointment.barber.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {appointment.client.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    tone={APPOINTMENT_STATUS_TONES[appointment.status] ?? "muted"}
                  >
                    {APPOINTMENT_STATUS_LABELS[appointment.status] ??
                      appointment.status}
                  </Badge>
                </td>
                <td
                  className="px-4 py-3 text-right"
                  onClick={(event) => event.stopPropagation()}
                >
                  {renderActions(appointment)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
