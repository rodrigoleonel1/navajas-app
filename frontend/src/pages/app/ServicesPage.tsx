import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppointmentMenu } from "../../components/AppointmentMenu";
import { ServiceCreateModal } from "../../components/ServiceCreateModal";
import { ServiceTable } from "../../components/ServiceTable";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ListCard } from "../../components/ui/ListCard";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Switch } from "../../components/ui/Switch";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../lib/api";
import {
  listServices,
  updateService,
  type Service,
} from "../../lib/services";
import { formatPrice } from "../../lib/format";

export function ServicesPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadServices() {
      setLoading(true);
      setListError("");
      try {
        const data = await listServices(showInactive);
        if (!cancelled) setServices(data);
      } catch (err) {
        if (!cancelled) {
          setServices([]);
          setListError(getErrorMessage(err, "Error al cargar servicios"));
        }
      } finally {
        if (!cancelled) setLoading(false);
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
        onSelect: () => navigate(`/app/admin/servicios/${service.id}`),
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
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mr-auto">
            Listado ({services.length})
          </h3>
          <Switch
            id="show-inactive"
            label="Ver inactivos"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
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
        {loading ? (
          <Loader label="Cargando servicios..." height="card" />
        ) : services.length === 0 ? (
          <p className="text-sm text-muted">
            {listError ? "Reintentá recargando la página." : "No hay servicios aún."}
          </p>
        ) : (
          <>
            <ServiceTable
              services={services}
              busyId={togglingId}
              onEdit={(service) => navigate(`/app/admin/servicios/${service.id}`)}
              onToggle={handleToggle}
            />
            <ul className="grid items-start gap-3 sm:grid-cols-2 lg:hidden">
              {services.map((service) => (
                <ListCard
                  key={service.id}
                  title={service.name}
                  actions={
                    <AppointmentMenu
                      ariaLabel={`Acciones de ${service.name}`}
                      busy={togglingId === service.id}
                      items={serviceMenuItems(service)}
                    />
                  }
                  subtitle={`${service.duration} min`}
                  footerLeft={formatPrice(service.price)}
                  footerRight={
                    <Badge tone={service.active ? "success" : "danger"}>
                      {service.active ? "Activo" : "Inactivo"}
                    </Badge>
                  }
                />
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
