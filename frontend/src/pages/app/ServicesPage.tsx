import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ServiceTable } from "../../components/ServiceTable";
import { ServiceCreateModal } from "../../components/ServiceCreateModal";
import { AppointmentMenu } from "../../components/AppointmentMenu";
import { getErrorMessage } from "../../lib/api";
import { useToast } from "../../hooks/useToast";
import {
  listServices,
  updateService,
  type Service,
} from "../../lib/appointments";

export function ServicesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [listError, setListError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadServices() {
      setListError("");
      try {
        const data = await listServices(showInactive);
        if (!cancelled) setServices(data);
      } catch (err) {
        if (!cancelled) {
          setServices([]);
          setListError(getErrorMessage(err, "Error al cargar servicios"));
        }
      }
    }
    loadServices();
    return () => {
      cancelled = true;
    };
  }, [showInactive, refreshKey]);

  async function handleToggle(service: Service) {
    const nextActive = !service.active;
    setTogglingId(service.id);
    try {
      await updateService(service.id, { active: nextActive });
      toast.success(
        nextActive ? "Servicio activado" : "Servicio desactivado",
      );
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al cambiar estado"));
    } finally {
      setTogglingId(null);
    }
  }

  function serviceMenuItems(service: Service) {
    return [
      {
        label: "Editar servicio",
        onSelect: () => navigate(`/app/services/${service.id}`),
      },
      service.active
        ? {
            label: "Desactivar",
            danger: true,
            onSelect: () => handleToggle(service),
          }
        : {
            label: "Reactivar",
            onSelect: () => handleToggle(service),
          },
    ];
  }

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Servicios"
        highlight="catálogo."
        description="Gestioná los servicios de la barbería."
      />

      <div className="mt-8 bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mr-auto">
            Listado ({services.length})
          </h3>
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="accent-primary h-4 w-4"
            />
            Ver inactivos
          </label>
          <div className="w-full sm:w-auto sm:flex sm:justify-end">
            <Button
              variant="primaryBlock"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={16} aria-hidden="true" />
              Agregar servicio
            </Button>
          </div>
        </div>
        {listError && (
          <p className="text-sm text-destructive mb-4">{listError}</p>
        )}
        {services.length === 0 ? (
          <p className="text-sm text-muted">
            {listError ? "Reintentá recargando la página." : "No hay servicios aún."}
          </p>
        ) : (
          <>
            <ServiceTable
              services={services}
              busyId={togglingId}
              onEdit={(service) => navigate(`/app/services/${service.id}`)}
              onToggle={handleToggle}
            />
            <ul className="flex flex-col gap-3 lg:hidden">
              {services.map((service) => (
                <li
                  key={service.id}
                  className="flex justify-between items-center gap-2 border border-border rounded-lg px-3 py-2"
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-medium flex items-center gap-2">
                      {service.name}
                      {!service.active && <Badge tone="danger">Inactivo</Badge>}
                    </span>
                    <span className="text-xs text-muted">
                      {service.duration} min — $
                      {service.price.toLocaleString("es-AR")}
                    </span>
                  </span>
                  <AppointmentMenu
                    ariaLabel={`Acciones de ${service.name}`}
                    busy={togglingId === service.id}
                    items={serviceMenuItems(service)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {showCreate && (
        <ServiceCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => setRefreshKey((key) => key + 1)}
        />
      )}
    </Section>
  );
}
