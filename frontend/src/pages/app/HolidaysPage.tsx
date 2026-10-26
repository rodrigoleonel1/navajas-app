import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppointmentMenu } from "../../components/AppointmentMenu";
import { HolidayFormModal } from "../../components/HolidayFormModal";
import { Button } from "../../components/ui/Button";
import { ListCard } from "../../components/ui/ListCard";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../lib/api";
import { formatDateKey, toBusinessDayKey } from "../../lib/datetime";
import { cn } from "../../lib/utils";
import {
  deleteHoliday,
  listHolidays,
  type CreateHolidayResult,
  type Holiday,
} from "../../lib/holidays";

export function HolidaysPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [warning, setWarning] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [modalHoliday, setModalHoliday] = useState<Holiday | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setListError("");
      try {
        const data = await listHolidays();
        if (!cancelled) setHolidays(data);
      } catch (err) {
        if (!cancelled) {
          setHolidays([]);
          setListError(getErrorMessage(err, "Error al cargar feriados"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function openCreate() {
    setWarning("");
    setShowCreate(true);
  }

  function closeModal() {
    setShowCreate(false);
    setModalHoliday(null);
  }

  function handleCreated(result: CreateHolidayResult) {
    setHolidays((prev) =>
      [...prev, result.holiday].sort((a, b) => a.date.localeCompare(b.date)),
    );
    if (result.affectedAppointments > 0) {
      setWarning(
        `Hay ${result.affectedAppointments} turno(s) pendiente(s) ese día. No se cancelaron automáticamente.`,
      );
    }
  }

  function handleUpdated(updated: Holiday) {
    setHolidays((prev) =>
      prev
        .map((item) => (item.id === updated.id ? updated : item))
        .sort((a, b) => a.date.localeCompare(b.date)),
    );
  }

  async function handleDelete(holiday: Holiday) {
    const ok = await confirm({
      title: "Eliminar feriado",
      message: `¿Eliminar "${holiday.name}" del ${formatDateKey(holiday.date)}? Ese día volverá a estar disponible.`,
      confirmLabel: "Eliminar",
    });
    if (!ok) return;

    setDeletingId(holiday.id);
    try {
      await deleteHoliday(holiday.id);
      setHolidays((prev) => prev.filter((item) => item.id !== holiday.id));
      if (modalHoliday?.id === holiday.id) setModalHoliday(null);
      toast.success("Feriado eliminado");
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al eliminar feriado"));
    } finally {
      setDeletingId(null);
    }
  }

  const todayKey = toBusinessDayKey(new Date().toISOString());
  const upcoming = holidays.filter((holiday) => holiday.date >= todayKey);
  const past = holidays.filter((holiday) => holiday.date < todayKey);

  function holidayMenuItems(holiday: Holiday) {
    return [
      {
        label: "Editar",
        onSelect: () => setModalHoliday(holiday),
      },
      {
        label: "Eliminar",
        danger: true,
        onSelect: () => handleDelete(holiday),
      },
    ];
  }

  function renderTable(items: Holiday[], faded = false) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted">
          {faded ? "Sin feriados pasados." : "No hay feriados próximos."}
        </p>
      );
    }

    return (
      <>
        <div className="hidden lg:block overflow-hidden rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted">
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((holiday) => (
                <tr
                  key={holiday.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-primary/5"
                >
                  <td
                    className={cn(
                      "px-4 py-3 font-jetbrains whitespace-nowrap",
                      faded ? "text-muted" : "font-medium",
                    )}
                  >
                    {formatDateKey(holiday.date)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3",
                      faded ? "text-muted" : "font-medium",
                    )}
                  >
                    {holiday.name}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AppointmentMenu
                      ariaLabel={`Acciones de ${holiday.name}`}
                      busy={deletingId === holiday.id}
                      items={holidayMenuItems(holiday)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="grid items-start gap-3 sm:grid-cols-2 lg:hidden">
          {items.map((holiday) => (
            <ListCard
              key={holiday.id}
              title={holiday.name}
              subtitle="Feriado del negocio"
              footerLeft={formatDateKey(holiday.date)}
              faded={faded}
              footerRight={
                <AppointmentMenu
                  ariaLabel={`Acciones de ${holiday.name}`}
                  busy={deletingId === holiday.id}
                  items={holidayMenuItems(holiday)}
                />
              }
            />
          ))}
        </ul>
      </>
    );
  }

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Feriados"
        highlight="del negocio."
        description="Gestioná los días que la barbería permanece cerrada."
      />

      <div className="mt-8 bg-card border border-border rounded-2xl p-6">
        {warning && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            <p className="flex-1">{warning}</p>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => setWarning("")}
              className="flex h-5 w-5 shrink-0 items-center justify-center transition-opacity hover:opacity-70 cursor-pointer"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mr-auto">
            Próximos ({upcoming.length})
          </h3>
          <div className="w-full sm:w-auto sm:flex sm:justify-end">
            <Button
              variant="primaryBlock"
              size="sm"
              className="w-full sm:w-auto"
              onClick={openCreate}
            >
              <Plus size={16} aria-hidden="true" />
              Agregar feriado
            </Button>
          </div>
        </div>
        {listError && (
          <p className="mb-4 text-sm text-destructive">{listError}</p>
        )}
        {loading ? (
          <Loader label="Cargando feriados..." height="card" />
        ) : (
          <>
            {renderTable(upcoming)}
            {past.length > 0 && (
              <div className="mt-6 border-t border-border pt-5">
                <h4 className="mb-3 font-barlow font-bold uppercase text-xs tracking-widest text-muted">
                  Pasados ({past.length})
                </h4>
                {renderTable(past, true)}
              </div>
            )}
          </>
        )}
      </div>

      {(showCreate || modalHoliday) && (
        <HolidayFormModal
          holiday={modalHoliday}
          onClose={closeModal}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      )}
    </Section>
  );
}
