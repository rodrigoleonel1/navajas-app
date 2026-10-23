import type { Service } from "../lib/appointments";
import { formatPrice } from "../lib/format";
import { AppointmentMenu } from "./AppointmentMenu";
import { Badge } from "./ui/Badge";

export function ServiceTable({
  services,
  onEdit,
  onToggle,
  busyId = null,
}: {
  services: Service[];
  onEdit: (service: Service) => void;
  onToggle: (service: Service) => void;
  busyId?: string | null;
}) {
  return (
    <div className="hidden lg:block overflow-hidden rounded-xl border border-border bg-background">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted">
            <th className="px-4 py-3 font-semibold">Nombre</th>
            <th className="px-4 py-3 font-semibold">Duración</th>
            <th className="px-4 py-3 font-semibold">Precio</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <tr
              key={service.id}
              className="border-b border-border last:border-0 transition-colors hover:bg-primary/5"
            >
              <td className="px-4 py-3 font-medium">{service.name}</td>
              <td className="px-4 py-3 text-muted whitespace-nowrap">
                {service.duration} min
              </td>
              <td className="px-4 py-3 text-muted whitespace-nowrap">
                {formatPrice(service.price)}
              </td>
              <td className="px-4 py-3">
                {service.active ? (
                  <Badge tone="success">Activo</Badge>
                ) : (
                  <Badge tone="danger">Inactivo</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <AppointmentMenu
                  ariaLabel={`Acciones de ${service.name}`}
                  busy={busyId === service.id}
                  items={[
                    {
                      label: "Editar servicio",
                      onSelect: () => onEdit(service),
                    },
                    service.active
                      ? {
                          label: "Desactivar",
                          danger: true,
                          onSelect: () => onToggle(service),
                        }
                      : {
                          label: "Reactivar",
                          onSelect: () => onToggle(service),
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
