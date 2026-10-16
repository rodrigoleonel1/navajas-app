import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Select } from "../../components/ui/Select";
import { AppointmentCard } from "../../components/AppointmentCard";
import { AppointmentTable } from "../../components/AppointmentTable";
import { AppointmentDetailModal } from "../../components/AppointmentDetailModal";
import { AppointmentMenu } from "../../components/AppointmentMenu";
import { getErrorMessage } from "../../lib/api";
import { shiftDayKey, toBusinessDayKey } from "../../lib/datetime";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useConfirm";
import {
  listAppointments,
  listBarbers,
  updateAppointmentStatus,
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
  const toast = useToast();
  const confirm = useConfirm();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState(() =>
    toBusinessDayKey(new Date().toISOString()),
  );
  const [status, setStatus] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Appointment | null>(null);

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

  async function handleStatusChange(
    appointment: Appointment,
    nextStatus: "completed" | "cancelled",
  ) {
    const label = nextStatus === "completed" ? "completado" : "cancelado";
    const confirmed = await confirm({
      title: `${nextStatus === "completed" ? "Completar" : "Cancelar"} turno`,
      message: `Marcar turno como ${label}?`,
      confirmLabel: nextStatus === "completed" ? "Completar" : "Confirmar",
    });
    if (!confirmed) return;
    setActingId(appointment.id);
    try {
      const updated = await updateAppointmentStatus(appointment.id, nextStatus);
      toast.success(`Turno ${label}`);
      setDetail((current) =>
        current?.id === updated.id ? updated : current,
      );
      const data = await listAppointments({
        ...(barberId ? { barberId } : {}),
        ...(date ? { date } : {}),
        ...(status ? { status } : {}),
      });
      setAppointments(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al cambiar estado"));
    } finally {
      setActingId(null);
    }
  }

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Agenda"
        highlight="general."
        description="Todos los turnos del local."
      />

      <div className="mt-8 bg-card border border-border rounded-2xl p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="agenda-date"
              className="font-barlow text-xs font-semibold tracking-widest uppercase text-muted-light"
            >
              Fecha
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Día anterior"
                onClick={() =>
                  setDate((prev) =>
                    shiftDayKey(
                      prev || toBusinessDayKey(new Date().toISOString()),
                      -1,
                    ),
                  )
                }
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary cursor-pointer"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <input
                id="agenda-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-background border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 transition-colors border-border focus:border-primary focus:ring-primary"
              />
              <button
                type="button"
                aria-label="Día siguiente"
                onClick={() =>
                  setDate((prev) =>
                    shiftDayKey(
                      prev || toBusinessDayKey(new Date().toISOString()),
                      1,
                    ),
                  )
                }
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary cursor-pointer"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
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
          <>
            <AppointmentTable
              appointments={appointments}
              onSelect={setDetail}
              renderActions={(appointment) => (
                <AppointmentMenu
                  busy={actingId === appointment.id}
                  items={[
                    {
                      label: "Ver detalle",
                      onSelect: () => setDetail(appointment),
                    },
                    ...(appointment.status === "pending"
                      ? [
                          {
                            label: "Completar turno",
                            onSelect: () =>
                              handleStatusChange(appointment, "completed"),
                          },
                          {
                            label: "Cancelar turno",
                            danger: true,
                            onSelect: () =>
                              handleStatusChange(appointment, "cancelled"),
                          },
                        ]
                      : []),
                  ]}
                />
              )}
            />
            <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:hidden">
              {appointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  busy={actingId === appointment.id}
                  onComplete={
                    appointment.status === "pending"
                      ? () => handleStatusChange(appointment, "completed")
                      : undefined
                  }
                  onCancel={
                    appointment.status === "pending"
                      ? () => handleStatusChange(appointment, "cancelled")
                      : undefined
                  }
                  onViewDetail={() => setDetail(appointment)}
                />
              ))}
            </ul>
          </>
        )}
      </div>
      {detail && (
        <AppointmentDetailModal
          appointment={detail}
          onClose={() => setDetail(null)}
          busy={actingId === detail.id}
          onComplete={
            detail.status === "pending"
              ? () => handleStatusChange(detail, "completed")
              : undefined
          }
          onCancel={
            detail.status === "pending"
              ? () => handleStatusChange(detail, "cancelled")
              : undefined
          }
        />
      )}
    </Section>
  );
}
