import { useEffect, useState } from "react";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { AppointmentRow } from "../../components/AppointmentRow";
import { getErrorMessage } from "../../lib/api";
import {
  listAppointments,
  listBarbers,
  type Appointment,
  type Barber,
} from "../../lib/appointments";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
];

export function AdminPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listBarbers()
      .then((data) => {
        if (!cancelled) setBarbers(data);
      })
      .catch(() => {
        if (!cancelled) setBarbers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setListError("");
      try {
        const data = await listAppointments({
          ...(barberId ? { barberId } : {}),
          ...(date ? { date } : {}),
          ...(status ? { status } : {}),
        });
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
  }, [barberId, date, status]);

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Gestión"
        highlight="general."
        description="Administrá barberos y agenda."
      />

      <div className="mt-8 bg-card border border-border rounded-2xl p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            id="agenda-barber"
            label="Barbero"
            value={barberId}
            onChange={(e) => setBarberId(e.target.value)}
          >
            <option value="">Todos</option>
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </Select>
          <Input
            id="agenda-date"
            label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Select
            id="agenda-status"
            label="Estado"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <h3 className="mt-4 font-barlow font-bold uppercase text-sm tracking-widest mb-4">
          Turnos ({appointments.length})
        </h3>
        {loading ? (
          <p className="text-sm text-muted">Cargando turnos...</p>
        ) : listError ? (
          <p className="text-sm text-destructive">{listError}</p>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-muted">
            No hay turnos para esos filtros.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {appointments.map((appointment) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
              />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
