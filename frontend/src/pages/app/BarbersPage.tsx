import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Button } from "../../components/ui/Button";
import { BarberTable } from "../../components/BarberTable";
import { BarberCreateModal } from "../../components/BarberCreateModal";
import { AppointmentMenu } from "../../components/AppointmentMenu";
import { Badge } from "../../components/ui/Badge";
import { getErrorMessage } from "../../lib/api";
import { useToast } from "../../hooks/useToast";
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
  const [listError, setListError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadBarbers() {
      setListError("");
      try {
        const data = await listBarbers(showInactive);
        if (!cancelled) setBarbers(data);
      } catch (err) {
        if (!cancelled) {
          setBarbers([]);
          setListError(getErrorMessage(err, "Error al cargar barberos"));
        }
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
        onSelect: () => navigate(`/app/barbers/${barber.id}`),
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
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mr-auto">
            Listado ({barbers.length})
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
              Agregar barbero
            </Button>
          </div>
        </div>
        {listError && (
          <p className="text-sm text-destructive mb-4">{listError}</p>
        )}
        {barbers.length === 0 ? (
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
              onEdit={(barber) => navigate(`/app/barbers/${barber.id}`)}
              onToggle={handleToggle}
            />
            <ul className="flex flex-col gap-3 lg:hidden">
              {barbers.map((barber) => (
                <li
                  key={barber.id}
                  className="flex justify-between items-center gap-2 border border-border rounded-lg px-3 py-2"
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-medium flex items-center gap-2">
                      {barber.name}
                      {!barber.active && (
                        <Badge tone="danger">Inactivo</Badge>
                      )}
                    </span>
                    <span className="text-xs text-muted">
                      {barber.email} ·{" "}
                      {barber.barberProfile?.workingHours?.start ?? "09:00"}–
                      {barber.barberProfile?.workingHours?.end ?? "18:00"}
                    </span>
                  </span>
                  <AppointmentMenu
                    ariaLabel={`Acciones de ${barber.name}`}
                    busy={togglingId === barber.id}
                    items={barberMenuItems(barber)}
                  />
                </li>
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
