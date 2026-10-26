import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppointmentMenu } from "../../components/AppointmentMenu";
import { HolidayFormModal } from "../../components/HolidayFormModal";
import { Button } from "../../components/ui/Button";
import { ListCard } from "../../components/ui/ListCard";
import { Loader } from "../../components/ui/Loader";
import { Pager } from "../../components/ui/Pager";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../lib/api";
import { formatDateKey } from "../../lib/datetime";
import { cn } from "../../lib/utils";
import {
  deleteHoliday,
  listHolidaysPage,
  type CreateHolidayResult,
  type Holiday,
} from "../../lib/holidays";

const PAGE_SIZE = 10;

export function HolidaysPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [upcoming, setUpcoming] = useState<Holiday[]>([]);
  const [past, setPast] = useState<Holiday[]>([]);
  const [upcomingTotal, setUpcomingTotal] = useState<number | null>(null);
  const [pastTotal, setPastTotal] = useState<number | null>(null);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
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
        const [upcomingRes, pastRes] = await Promise.all([
          listHolidaysPage({
            scope: "upcoming",
            page: upcomingPage,
            limit: PAGE_SIZE,
          }),
          listHolidaysPage({
            scope: "past",
            page: pastPage,
            limit: PAGE_SIZE,
          }),
        ]);
        if (cancelled) return;
        setUpcoming(upcomingRes.items);
        setUpcomingTotal(upcomingRes.total);
        setPast(pastRes.items);
        setPastTotal(pastRes.total);
        // Si un borrado deja la página vacía, retrocede para no mostrarla.
        if (upcomingRes.items.length === 0 && upcomingPage > 1) {
          setUpcomingPage((current) => Math.max(1, current - 1));
        }
        if (pastRes.items.length === 0 && pastPage > 1) {
          setPastPage((current) => Math.max(1, current - 1));
        }
      } catch (err) {
        if (!cancelled) {
          setUpcoming([]);
          setPast([]);
          setUpcomingTotal(null);
          setPastTotal(null);
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
  }, [upcomingPage, pastPage, refreshKey]);

  function openCreate() {
    setWarning("");
    setShowCreate(true);
  }

  function closeModal() {
    setShowCreate(false);
    setModalHoliday(null);
  }

  function reload() {
    // La fecha puede mover el feriado de sección: volvemos a la primera página.
    setUpcomingPage(1);
    setPastPage(1);
    setRefreshKey((key) => key + 1);
  }

  function handleCreated(result: CreateHolidayResult) {
    reload();
    if (result.affectedAppointments > 0) {
      setWarning(
        `Hay ${result.affectedAppointments} turno(s) pendiente(s) ese día. No se cancelaron automáticamente.`,
      );
    }
  }

  function handleUpdated() {
    reload();
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
      if (modalHoliday?.id === holiday.id) setModalHoliday(null);
      setRefreshKey((key) => key + 1);
      toast.success("Feriado eliminado");
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al eliminar feriado"));
    } finally {
      setDeletingId(null);
    }
  }

  const upcomingTotalPages =
    upcomingTotal === null
      ? null
      : Math.max(1, Math.ceil(upcomingTotal / PAGE_SIZE));
  const upcomingHasNext =
    upcomingTotalPages !== null && upcomingPage < upcomingTotalPages;
  const pastTotalPages =
    pastTotal === null ? null : Math.max(1, Math.ceil(pastTotal / PAGE_SIZE));
  const pastHasNext = pastTotalPages !== null && pastPage < pastTotalPages;
  const hasPast = pastTotal !== null && pastTotal > 0;
  // Solo el primer fetch tapa las tablas: al cambiar de página se mantienen
  // visibles y las flechas quedan deshabilitadas por `loading`.
  const initialLoading = loading && upcoming.length === 0 && past.length === 0;

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

      <div
        className={cn(
          "mt-8 grid gap-6 xl:items-start",
          hasPast && "xl:grid-cols-2",
        )}
      >
        <div className="bg-card border border-border rounded-2xl p-6">
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
              Próximos ({upcomingTotal ?? 0})
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
          {initialLoading ? (
            <Loader label="Cargando feriados..." height="card" />
          ) : (
            <>
              {renderTable(upcoming)}
              {upcomingTotal !== null && upcomingTotal > 0 && (
                <Pager
                  page={upcomingPage}
                  totalPages={upcomingTotalPages}
                  hasNext={upcomingHasNext}
                  loading={loading}
                  onPage={setUpcomingPage}
                  label="feriados"
                  pageSize={PAGE_SIZE}
                  shown={upcoming.length}
                  total={upcomingTotal}
                />
              )}
            </>
          )}
        </div>

        {hasPast && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
                Pasados ({pastTotal})
              </h3>
            </div>
            {initialLoading ? (
              <Loader label="Cargando feriados..." height="card" />
            ) : (
              <>
                {renderTable(past, true)}
                <Pager
                  page={pastPage}
                  totalPages={pastTotalPages}
                  hasNext={pastHasNext}
                  loading={loading}
                  onPage={setPastPage}
                  label="feriados pasados"
                  pageSize={PAGE_SIZE}
                  shown={past.length}
                  total={pastTotal}
                />
              </>
            )}
          </div>
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
