import { useEffect, useRef, useState } from "react";
import { AppointmentCard } from "../../components/AppointmentCard";
import { Pager } from "../../components/ui/Pager";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../lib/api";
import {
  listAppointmentHistory,
  listAppointments,
  type Appointment,
} from "../../lib/appointments";

// El historial se pagina de a 12: puede tener cientos de turnos y 12 llena
// justo las filas de 2 y de 3 columnas (1, 2 y 3 son divisores).
const HISTORY_PAGE_SIZE = 12;

export function ClientTurnosPage() {
  const toast = useToast();
  // Corte fijo entre próximos e historial, tomado al entrar a la página.
  const [boundIso] = useState(() => new Date().toISOString());
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loadedPage, setLoadedPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
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

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Cliente"
        title="Mis"
        highlight="turnos."
        description="Consultá tus próximos turnos."
      />

      {loading ? (
        <p className="mt-6 text-sm text-muted">Cargando turnos...</p>
      ) : listError ? (
        <p className="mt-6 text-sm text-destructive">{listError}</p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
              Próximos ({upcoming.length})
            </h3>
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
    </Section>
  );
}
