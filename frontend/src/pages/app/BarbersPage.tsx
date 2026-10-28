import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppointmentMenu } from "../../components/AppointmentMenu";
import { BarberCreateModal } from "../../components/BarberCreateModal";
import { BarberTable } from "../../components/BarberTable";
import { RatingSummary } from "../../components/RatingSummary";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ListCard } from "../../components/ui/ListCard";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Switch } from "../../components/ui/Switch";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../lib/api";
import { listBarbers, updateBarberProfile } from "../../lib/appointments";
import type { Barber } from "../../lib/appointments";

export function BarbersPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadBarbers() {
      setLoading(true);
      setListError("");
      try {
        const data = await listBarbers(showInactive);
        if (!cancelled) setBarbers(data);
      } catch (err) {
        if (!cancelled) {
          setBarbers([]);
          setListError(getErrorMessage(err, "Error al cargar barberos"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadBarbers();
    return () => {
      cancelled = true;
    };
  }, [showInactive, refreshKey]);

  function barberMenuItems(barber: Barber) {
    return [
      {
        label: "Editar barbero",
        onSelect: () => navigate(`/app/admin/barberos/${barber.id}`),
      },
      barber.active
        ? {
            label: "Desactivar",
            danger: true,
            onSelect: () => handleToggle(barber),
          }
        : {
            label: "Reactivar",
            onSelect: () => handleToggle(barber),
          },
    ];
  }

  async function handleToggle(barber: Barber) {
    const nextActive = !barber.active;
    setTogglingId(barber.id);
    try {
      await updateBarberProfile(barber.id, { active: nextActive });
      toast.success(
        nextActive ? "Barbero activado" : "Barbero desactivado",
      );
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al cambiar estado"));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Barberos"
        highlight="equipo."
        description="Gestioná tu equipo de barberos."
      />

      <div className="mt-6 bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mr-auto">
            Listado ({barbers.length})
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
              Agregar barbero
            </Button>
          </div>
        </div>
        {listError && (
          <p className="text-sm text-destructive mb-4">{listError}</p>
        )}
        {loading ? (
          <Loader label="Cargando barberos..." height="card" />
        ) : barbers.length === 0 ? (
          <p className="text-sm text-muted">
            {listError
              ? "Reintentá recargando la página."
              : "No hay barberos aún."}
          </p>
        ) : (
          <>
            <BarberTable
              barbers={barbers}
              busyId={togglingId}
              onEdit={(barber) => navigate(`/app/admin/barberos/${barber.id}`)}
              onToggle={handleToggle}
            />
            <ul className="grid items-start gap-3 sm:grid-cols-2 lg:hidden">
              {barbers.map((barber) => (
                <ListCard
                  key={barber.id}
                  title={barber.name}
                  actions={
                    <AppointmentMenu
                      ariaLabel={`Acciones de ${barber.name}`}
                      busy={togglingId === barber.id}
                      items={barberMenuItems(barber)}
                    />
                  }
                  subtitle={barber.email}
                  detail={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        {(barber.barberProfile?.daysOff?.length ?? 0) > 0
                          ? `${barber.barberProfile?.daysOff?.length} días libres`
                          : "Sin días libres"}
                      </span>
                      <RatingSummary
                        average={barber.ratingAverage}
                        count={barber.ratingCount}
                      />
                    </span>
                  }
                  footerLeft={`${barber.barberProfile?.workingHours?.start ?? "09:00"}–${barber.barberProfile?.workingHours?.end ?? "18:00"} hs`}
                  footerRight={
                    <Badge tone={barber.active ? "success" : "danger"}>
                      {barber.active ? "Activo" : "Inactivo"}
                    </Badge>
                  }
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {showCreate && (
        <BarberCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => setRefreshKey((key) => key + 1)}
        />
      )}
    </Section>
  );
}
