import { useEffect, useState } from "react";
import { AppointmentCard } from "../../components/AppointmentCard";
import { DateField } from "../../components/ui/DateField";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { getErrorMessage } from "../../lib/api";
import {
  listAppointments,
  type Appointment,
} from "../../lib/appointments";
import { getUser } from "../../lib/auth";
import { formatDateKey, toBusinessDayKey } from "../../lib/datetime";

export function BarberPage() {
  const barberName = getUser()?.name ?? "Barbero";
  const [date, setDate] = useState(() =>
    toBusinessDayKey(new Date().toISOString()),
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setListError("");
      try {
        const data = await listAppointments({ date });
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
  }, [date]);

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Barbero"
        title="Agenda"
        highlight={`${barberName}.`}
        description="Consultá tus turnos."
      />

      <div className="mt-8 bg-card border border-border rounded-2xl p-6">
        <div className="max-w-xs">
          <DateField
            id="agenda-date"
            label="Día"
            value={date}
            onChange={setDate}
          />
        </div>
        <h3 className="mt-4 font-barlow font-bold uppercase text-sm tracking-widest mb-4">
          Turnos del {formatDateKey(date)} ({appointments.length})
        </h3>
        {loading ? (
          <p className="text-sm text-muted">Cargando turnos...</p>
        ) : listError ? (
          <p className="text-sm text-destructive">{listError}</p>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-muted">No tenés turnos ese día.</p>
        ) : (
          <ul className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                hideBarber
              />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
