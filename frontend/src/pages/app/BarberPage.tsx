import { useEffect, useState } from "react";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Input } from "../../components/ui/Input";
import { AppointmentRow } from "../../components/AppointmentRow";
import { getErrorMessage } from "../../lib/api";
import { formatDateKey, toBusinessDayKey } from "../../lib/datetime";
import {
  listAppointments,
  type Appointment,
} from "../../lib/appointments";

export function BarberPage() {
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
        highlight="barbero."
        description="Consultá tus turnos e ingresos."
      />

      <div className="mt-8 bg-card border border-border rounded-2xl p-6">
        <div className="max-w-xs">
          <Input
            id="agenda-date"
            label="Día"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
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
          <ul className="flex flex-col gap-3">
            {appointments.map((appointment) => (
              <AppointmentRow
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
