import type { Barber } from "../lib/appointments";
import { AppointmentMenu } from "./AppointmentMenu";
import { Badge } from "./ui/Badge";

export function BarberTable({
  barbers,
  onEdit,
  onToggle,
  busyId = null,
}: {
  barbers: Barber[];
  onEdit: (barber: Barber) => void;
  onToggle: (barber: Barber) => void;
  busyId?: string | null;
}) {
  return (
    <div className="hidden lg:block overflow-hidden rounded-xl border border-border bg-background">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted">
            <th className="px-4 py-3 font-semibold">Nombre</th>
            <th className="px-4 py-3 font-semibold">Email</th>
            <th className="px-4 py-3 font-semibold">Jornada</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {barbers.map((barber) => (
            <tr
              key={barber.id}
              className="border-b border-border last:border-0 transition-colors hover:bg-primary/5"
            >
              <td className="px-4 py-3 font-medium">{barber.name}</td>
              <td className="px-4 py-3 text-muted">{barber.email}</td>
              <td className="px-4 py-3 text-muted whitespace-nowrap">
                {barber.barberProfile?.workingHours?.start ?? "09:00"}–
                {barber.barberProfile?.workingHours?.end ?? "18:00"}
              </td>
              <td className="px-4 py-3">
                {barber.active ? (
                  <Badge tone="success">Activo</Badge>
                ) : (
                  <Badge tone="danger">Inactivo</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <AppointmentMenu
                  ariaLabel={`Acciones de ${barber.name}`}
                  busy={busyId === barber.id}
                  items={[
                    {
                      label: "Editar barbero",
                      onSelect: () => onEdit(barber),
                    },
                    barber.active
                      ? {
                          label: "Desactivar",
                          danger: true,
                          onSelect: () => onToggle(barber),
                        }
                      : {
                          label: "Reactivar",
                          onSelect: () => onToggle(barber),
                        },
                  ]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
