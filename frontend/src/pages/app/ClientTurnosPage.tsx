import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppointmentCard } from "../../components/AppointmentCard";
import { RatingModal } from "../../components/RatingModal";
import { Loader } from "../../components/ui/Loader";
import { Modal } from "../../components/ui/Modal";
import { Pager } from "../../components/ui/Pager";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../lib/api";
import {
  cancelAppointment,
  listAppointmentHistory,
  listAppointments,
  type Appointment,
  type CancelType,
} from "../../lib/appointments";
import type { RatingResult } from "../../lib/ratings";

// El historial se pagina de a 12: puede tener cientos de turnos y 12 llena
// justo las filas de 2 y de 3 columnas (1, 2 y 3 son divisores).
const HISTORY_PAGE_SIZE = 12;

const CANCEL_MESSAGES: Record<CancelType, string> = {
  free: "Cancelás con al menos 24 h. No hay penalización y el horario queda libre.",
  late: "Cancelás entre 4 y 24 h. El horario queda libre, pero se registra una inasistencia.",
  blocked:
    "Cancelás con menos de 4 h. El horario NO se libera y se registra una inasistencia.",
};

const CANCEL_SUCCESS: Record<CancelType, string> = {
  free: "Turno cancelado sin penalización.",
  late: "Turno cancelado. Se registró una inasistencia.",
  blocked:
    "Turno cancelado. Se registró una inasistencia y el horario no se liberó.",
};

export function ClientTurnosPage() {
  const toast = useToast();
  const confirm = useConfirm();
  // Corte fijo entre próximos e historial, tomado al entrar a la página.
  const [boundIso] = useState(() => new Date().toISOString());
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loadedPage, setLoadedPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [ratingTarget, setRatingTarget] = useState<Appointment | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement | null>(null);
  const firstLoadRef = useRef(true);

  // Próximos: los que arrancan después de ahora, de cualquier estado (así un
  // turno del futuro cancelado no queda oculto).
  useEffect(() => {
    let cancelled = false;
    listAppointments({ order: "asc", cursor: boundIso })
      .then((list) => {
        if (!cancelled) setUpcoming(list);
      })
      .catch((err) => {
        if (!cancelled) {
          setListError(getErrorMessage(err, "Error al cargar turnos"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [boundIso]);

  // Historial: los anteriores a `boundIso`, del más nuevo al más viejo, una
  // página de HISTORY_PAGE_SIZE.
  useEffect(() => {
    let cancelled = false;
    const isFirstLoad = firstLoadRef.current;
    firstLoadRef.current = false;
    listAppointmentHistory({ before: boundIso, page, limit: HISTORY_PAGE_SIZE })
      .then(({ items, total }) => {
        if (cancelled) return;
        // Página fuera de rango (se borraron turnos): volver a la anterior.
        if (items.length === 0 && page > 1) {
          setPage((current) => Math.max(1, current - 1));
          return;
        }
        setHistory(items);
        setHistoryTotal(total);
        setLoadedPage(page);
        setListError("");
        if (!isFirstLoad) {
          historyRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const message = getErrorMessage(err, "Error al cargar el historial");
        if (isFirstLoad) setListError(message);
        else toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [boundIso, page, toast]);

  // Mientras la página pedida no sea la mostrada, hay carga en curso.
  const loadingPage = loadedPage !== page;
  const totalPages =
    historyTotal === null
      ? null
      : Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE));
  const hasNext =
    totalPages === null ? history.length === HISTORY_PAGE_SIZE : page < totalPages;

  // La nota recién creada se refleja en las dos listas sin recargar.
  function handleRated(result: RatingResult) {
    const applyRating = (items: Appointment[]) =>
      items.map((item) =>
        item.id === result.appointmentId
          ? { ...item, rating: result.score, ratedAt: result.ratedAt }
          : item,
      );
    setUpcoming(applyRating);
    setHistory(applyRating);
    setRatingTarget(null);
  }

  async function handleCancel(appointment: Appointment) {
    const cancelType = appointment.cancelType;
    if (appointment.status !== "pending" || !cancelType) return;

    const confirmed = await confirm({
      title: "Cancelar turno",
      message: CANCEL_MESSAGES[cancelType],
      confirmLabel: "Cancelar turno",
      cancelLabel: "Volver",
    });
    if (!confirmed) return;

    setActingId(appointment.id);
    try {
      const updated = await cancelAppointment(appointment.id);
      setUpcoming((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(
        CANCEL_SUCCESS[updated.cancelType ?? cancelType] ?? "Turno cancelado",
      );
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al cancelar el turno"));
    } finally {
      setActingId(null);
    }
  }

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Cliente"
        title="Mis"
        highlight="turnos."
        description="Consultá tus próximos turnos."
      />

      {loading ? (
        <Loader label="Cargando turnos..." height="page" />
      ) : listError ? (
        <p className="mt-6 text-sm text-destructive">{listError}</p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
                Próximos ({upcoming.length})
              </h3>
              <button
                type="button"
                onClick={() => setRulesOpen(true)}
                aria-label="Ver reglas de cancelación"
                className="flex h-8 w-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-muted/40 bg-background/50 text-[11px] font-medium text-muted-light transition-colors hover:border-primary hover:text-primary sm:w-auto sm:px-3"
              >
                <Info size={14} aria-hidden="true" />
                <span className="hidden sm:inline">Reglas</span>
              </button>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">
                No tenés turnos próximos reservados.
              </p>
            ) : (
              <ul className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    hideClient
                    busy={actingId === appointment.id}
                    onCancel={
                      appointment.status === "pending" &&
                      appointment.cancelType
                        ? () => handleCancel(appointment)
                        : undefined
                    }
                    onRate={
                      appointment.status === "completed" &&
                      appointment.rating == null
                        ? () => setRatingTarget(appointment)
                        : undefined
                    }
                  />
                ))}
              </ul>
            )}
          </div>

          <div
            ref={historyRef}
            className="scroll-mt-6 bg-card border border-border rounded-2xl p-6"
          >
            <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
              Historial ({historyTotal ?? history.length})
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-muted">Todavía no tenés historial.</p>
            ) : (
              <>
                <ul className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {history.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      hideClient
                      onRate={
                        appointment.status === "completed" &&
                        appointment.rating == null
                          ? () => setRatingTarget(appointment)
                          : undefined
                      }
                    />
                  ))}
                </ul>
                <Pager
                  page={page}
                  totalPages={totalPages}
                  hasNext={hasNext}
                  loading={loadingPage}
                  onPage={setPage}
                />
              </>
            )}
          </div>
        </div>
      )}

      {rulesOpen && (
        <Modal
          title="Reglas de cancelación"
          onClose={() => setRulesOpen(false)}
        >
          <p className="text-sm text-foreground">
            Podés cancelar desde Mis turnos mientras el turno no haya
            comenzado.
          </p>
          <ul className="mt-4 space-y-3">
            {(["free", "late", "blocked"] as const).map((kind) => (
              <li key={kind} className="flex gap-2 text-sm text-muted-light">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{CANCEL_MESSAGES[kind]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-light">
            Las inasistencias se acumulan: con 3 en los últimos 2 meses, la
            próxima reserva tiene un recargo del{" "}
            <span className="font-semibold text-foreground">20%</span>.
          </p>
          <p className="mt-2 text-xs text-muted">
            Al cancelar te mostramos qué corresponde según la hora de tu turno.
          </p>
        </Modal>
      )}

      {ratingTarget && (
        <RatingModal
          appointment={ratingTarget}
          onClose={() => setRatingTarget(null)}
          onRated={handleRated}
        />
      )}
    </Section>
  );
}
