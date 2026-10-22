import { useEffect, useState } from "react";
import { AppointmentCard } from "../../components/AppointmentCard";
import { AppointmentDetailModal } from "../../components/AppointmentDetailModal";
import { AppointmentMenu } from "../../components/AppointmentMenu";
import { AppointmentTable } from "../../components/AppointmentTable";
import { DateField } from "../../components/ui/DateField";
import { Pager } from "../../components/ui/Pager";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Select } from "../../components/ui/Select";
import { Switch } from "../../components/ui/Switch";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../lib/api";
import {
  listAppointments,
  listAppointmentsPage,
  listBarbers,
  updateAppointmentStatus,
  type Appointment,
  type Barber,
} from "../../lib/appointments";
import { toBusinessDayKey } from "../../lib/datetime";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
];

const PAGE_SIZE = 12;

// Sin "Todas las fechas" lista el día completo; con el switch, pagina todo el
// registro (pasado y futuro) de más nuevo a más viejo.
async function fetchAppointments(params: {
  allDates: boolean;
  page: number;
  barberId: string;
  date: string;
  status: string;
}): Promise<{ items: Appointment[]; total: number | null }> {
  const filters = {
    ...(params.barberId ? { barberId: params.barberId } : {}),
    ...(params.status ? { status: params.status } : {}),
  };

  if (params.allDates) {
    return listAppointmentsPage({
      ...filters,
      page: params.page,
      limit: PAGE_SIZE,
      order: "desc",
    });
  }

  return {
    items: await listAppointments({
      ...filters,
      ...(params.date ? { date: params.date } : {}),
    }),
    total: null,
  };
}

export function AdminPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState(() =>
    toBusinessDayKey(new Date().toISOString()),
  );
  const [status, setStatus] = useState("");
  const [allDates, setAllDates] = useState(false);
  const [page, setPage] = useState(1);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [total, setTotal] = useState<number | null>(null);
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
        const { items, total: totalCount } = await fetchAppointments({
          allDates,
          page,
          barberId,
          date,
          status,
        });
        if (!cancelled) {
          setAppointments(items);
          setTotal(totalCount);
        }
      } catch (err) {
        if (!cancelled) {
          setAppointments([]);
          setTotal(null);
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
  }, [allDates, barberId, date, page, status]);

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
      const { items, total: totalCount } = await fetchAppointments({
        allDates,
        page,
        barberId,
        date,
        status,
      });
      setAppointments(items);
      setTotal(totalCount);
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al cambiar estado"));
    } finally {
      setActingId(null);
    }
  }

  const totalPages =
    total === null ? null : Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasNext = totalPages !== null && page < totalPages;

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Agenda"
        highlight="general."
        description="Todos los turnos del local."
      />

      <div className="mt-8 bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
            {allDates
              ? `Todos los turnos (${total ?? appointments.length})`
              : `Turnos (${appointments.length})`}
          </h3>
          <Switch
            id="agenda-all-dates"
            label="Todas las fechas"
            checked={allDates}
            onChange={(e) => {
              setAllDates(e.target.checked);
              setPage(1);
            }}
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            id="agenda-barber"
            label="Barbero"
            value={barberId}
            onChange={(e) => {
              setBarberId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            {barbers.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </Select>
          <div
            className={allDates ? "opacity-40" : undefined}
            inert={allDates || undefined}
          >
            <DateField
              id="agenda-date"
              label="Fecha"
              value={date}
              onChange={(value) => {
                setDate(value);
                setPage(1);
              }}
            />
          </div>
          <Select
            id="agenda-status"
            label="Estado"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {loading && appointments.length === 0 ? (
          <p className="mt-6 text-sm text-muted">Cargando turnos...</p>
        ) : listError ? (
          <p className="mt-6 text-sm text-destructive">{listError}</p>
        ) : appointments.length === 0 ? (
          <p className="mt-6 text-sm text-muted">
            {allDates
              ? "No hay turnos en el registro."
              : "No hay turnos para esos filtros."}
          </p>
        ) : (
          <div className="mt-6">
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
            <ul className="mt-3 grid items-start gap-3 sm:grid-cols-2 lg:hidden">
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
                />
              ))}
            </ul>
          </div>
        )}
        {allDates && (
          <Pager
            page={page}
            totalPages={totalPages}
            hasNext={hasNext}
            loading={loading}
            onPage={setPage}
            label="turnos"
            pageSize={PAGE_SIZE}
            shown={appointments.length}
            total={total}
          />
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
