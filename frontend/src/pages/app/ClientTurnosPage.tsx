import { useEffect, useMemo, useState } from "react";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { AppointmentRow } from "../../components/AppointmentRow";
import { getErrorMessage } from "../../lib/api";
import {
  listAppointments,
  type Appointment,
} from "../../lib/appointments";

export function ClientTurnosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setListError("");
      try {
        const data = await listAppointments();
        if (!cancelled) setAppointments(data);
      } catch (err) {
        if (!cancelled) {
          setAppointments([]);
          setListError(getErrorMessage(err, "Error al cargar turnos"));
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

  const { upcoming, history } = useMemo(() => {
    const upcoming = appointments
      .filter(
        (appointment) =>
          appointment.status === "pending" &&
          new Date(appointment.startAt).getTime() >= now,
      )
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    const upcomingIds = new Set(upcoming.map((appointment) => appointment.id));
    const history = appointments
      .filter((appointment) => !upcomingIds.has(appointment.id))
      .sort((a, b) => +new Date(b.startAt) - +new Date(a.startAt));
    return { upcoming, history };
  }, [appointments, now]);

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
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
              Próximos ({upcoming.length})
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">
                No tenés turnos próximos reservados.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {upcoming.map((appointment) => (
                  <AppointmentRow
                    key={appointment.id}
                    appointment={appointment}
                    hideClient
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
              Historial ({history.length})
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-muted">Todavía no tenés historial.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {history.map((appointment) => (
                  <AppointmentRow
                    key={appointment.id}
                    appointment={appointment}
                    hideClient
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Section>
  );
}
