import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, Clock } from "lucide-react";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Button } from "../../components/ui/Button";
import { getErrorMessage } from "../../lib/api";
import {
  businessDayKeysFromToday,
  formatDayHour,
  formatFull,
  formatHour,
  formatWeekdayDay,
  toBusinessDayKey,
} from "../../lib/datetime";
import {
  createAppointment,
  getAvailability,
  getConflictSuggestion,
  listBarbers,
  listServices,
  type Appointment,
  type Availability,
  type Barber,
  type Service,
} from "../../lib/appointments";

function toLocalDateKey(date: Date): string {
  return toBusinessDayKey(date.toISOString());
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString("es-AR")}`;
}

export function ClientPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState(() =>
    toLocalDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000)),
  );

  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [nonWorkingDays, setNonWorkingDays] = useState<string[]>([]);

  const [selectedSlot, setSelectedSlot] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookError, setBookError] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const [svc, brb] = await Promise.all([listServices(), listBarbers()]);
        setServices(svc);
        setBarbers(brb);
      } catch (err) {
        setCatalogError(getErrorMessage(err, "Error al cargar servicios"));
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  const readyToSearch = serviceIds.length > 0 && barberId !== "" && date !== "";
  const serviceIdsKey = serviceIds.join(",");

  // Días no laborables de la ventana visible (tira desde hoy).
  const canLoadStrip = serviceIds.length > 0 && barberId !== "";
  useEffect(() => {
    if (!canLoadStrip) return;
    let cancelled = false;
    getAvailability({
      barberId,
      date: toBusinessDayKey(new Date().toISOString()),
      serviceIds,
    })
      .then((res) => {
        if (!cancelled) setNonWorkingDays(res.nonWorkingDays);
      })
      .catch(() => {
        if (!cancelled) setNonWorkingDays([]);
      });
    return () => {
      cancelled = true;
    };
  }, [barberId, serviceIdsKey, canLoadStrip]); // eslint-disable-line react-hooks/exhaustive-deps

  const stripNonWorkingDays = canLoadStrip ? nonWorkingDays : [];

  useEffect(() => {
    if (!readyToSearch) return;
    let cancelled = false;
    async function loadSlots() {
      setLoadingSlots(true);
      setSlotsError("");
      setSelectedSlot("");
      try {
        const data = await getAvailability({ barberId, date, serviceIds });
        if (!cancelled) setAvailability(data);
      } catch (err) {
        if (!cancelled) {
          setAvailability(null);
          setSlotsError(getErrorMessage(err, "Error al buscar horarios"));
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    }
    loadSlots();
    return () => {
      cancelled = true;
    };
  }, [barberId, date, serviceIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => {    const chosen = services.filter((s) => serviceIds.includes(s.id));
    return {
      duration: chosen.reduce((acc, s) => acc + s.duration, 0),
      price: chosen.reduce((acc, s) => acc + s.price, 0),
    };
  }, [services, serviceIds]);

  const shownAvailability = readyToSearch ? availability : null;

  function toggleService(id: string) {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  async function handleConfirm(slotStartAt?: string) {
    const startAt = slotStartAt ?? selectedSlot;
    if (!startAt || isBooking) return;
    setIsBooking(true);
    setBookError("");
    setSuggestion(null);
    try {
      const appointment = await createAppointment({
        barberId,
        serviceIds,
        startAt,
      });
      setBooked(appointment);
    } catch (err) {
      setBookError(getErrorMessage(err, "Error al reservar el turno"));
      setSuggestion(getConflictSuggestion(err));
    } finally {
      setIsBooking(false);
    }
  }

  if (booked) {
    const barberName =
      barbers.find((b) => b.id === booked.barber.id)?.name ??
      booked.barber.name ??
      "Barbero";
    return (
      <Section>
        <SectionHeader
          eyebrow="Panel — Cliente"
          title="Turno"
          highlight="confirmado."
          description="Te enviamos la confirmación por email."
        />
        <div className="mt-8 max-w-md mx-auto bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          <CheckCircle2
            size={32}
            aria-hidden="true"
            className="text-primary"
          />
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Barbero</dt>
              <dd className="font-medium">{barberName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Fecha</dt>
              <dd className="font-medium">
                {formatFull(booked.startAt)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Duración</dt>
              <dd className="font-medium">{booked.durationSnapshot} min</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Precio</dt>
              <dd className="font-medium">
                {formatPrice(booked.priceSnapshot)}
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2">
            <Button variant="primaryBlock" href="/app/client/turnos">
              Ver mis turnos
            </Button>
            <Button variant="outline" onClick={() => setBooked(null)}>
              Reservar otro turno
            </Button>
          </div>
        </div>
      </Section>
    );
  }

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Cliente"
        title="Reservar"
        highlight="turno."
        description="Elegí servicio, barbero y horario disponible."
      />

      {catalogError && (
        <p className="mt-6 text-sm text-destructive">{catalogError}</p>
      )}

      {loadingCatalog ? (
        <p className="mt-6 text-sm text-muted">Cargando servicios...</p>
      ) : (
        <div className="mt-8 flex flex-col gap-6 max-w-2xl mx-auto">
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
              1. Servicios
            </h3>
            {services.length === 0 ? (
              <p className="text-sm text-muted">
                No hay servicios disponibles por el momento.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {services.map((service) => (
                  <li key={service.id}>
                    <label className="flex justify-between items-center border border-border rounded-lg px-3 py-2 cursor-pointer has-checked:border-primary transition-colors">
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={serviceIds.includes(service.id)}
                          onChange={() => toggleService(service.id)}
                          className="accent-primary h-4 w-4"
                        />
                        <span className="text-sm font-medium">
                          {service.name}
                        </span>
                        <span className="text-xs text-muted inline-flex items-center gap-1">
                          <Clock
                            size={14}
                            aria-hidden="true"
                            className="opacity-60"
                          />
                          {service.duration} min
                        </span>
                      </span>
                      <span className="text-sm font-semibold">
                        {formatPrice(service.price)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {totals.duration > 0 && (
              <p className="mt-3 text-sm text-muted">
                Total: {totals.duration} min — {formatPrice(totals.price)}
              </p>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
              2. Barbero
            </h3>
            {barbers.length === 0 ? (
              <p className="text-sm text-muted">
                No hay barberos disponibles por el momento.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {barbers.map((barber) => (
                  <li key={barber.id}>
                    <label className="flex items-center gap-3 border border-border rounded-lg px-3 py-2 cursor-pointer has-checked:border-primary transition-colors">
                      <input
                        type="radio"
                        name="barber"
                        checked={barberId === barber.id}
                        onChange={() => setBarberId(barber.id)}
                        className="accent-primary h-4 w-4"
                      />
                      <span className="text-sm font-medium">{barber.name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
              3. Fecha y horario
            </h3>
            <div
              className="flex gap-2 overflow-x-auto pb-2"
              role="group"
              aria-label="Elegir fecha"
            >
              {businessDayKeysFromToday(14).map((dayKey) => {
                const disabled = stripNonWorkingDays.includes(dayKey);
                const selected = date === dayKey;
                return (
                  <button
                    key={dayKey}
                    type="button"
                    disabled={disabled}
                    onClick={() => setDate(dayKey)}
                    aria-pressed={selected}
                    aria-label={`${formatWeekdayDay(dayKey)}${disabled ? " (no laborable)" : ""}`}
                    className={
                      selected
                        ? "shrink-0 border border-primary bg-primary/10 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
                        : disabled
                          ? "shrink-0 border border-border rounded-lg px-3 py-2 text-sm text-muted opacity-40 cursor-not-allowed"
                          : "shrink-0 border border-border rounded-lg px-3 py-2 text-sm hover:border-primary transition-colors"
                    }
                  >
                    {formatWeekdayDay(dayKey)}
                  </button>
                );
              })}
            </div>
            <div className="mt-4">
              {!readyToSearch ? (
                <p className="text-sm text-muted">
                  Elegí al menos un servicio y un barbero para ver horarios.
                </p>
              ) : loadingSlots ? (
                <p className="text-sm text-muted">Buscando horarios...</p>
              ) : slotsError ? (
                <p className="text-sm text-destructive">{slotsError}</p>
              ) : shownAvailability && shownAvailability.slots.length === 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-muted">Sin horarios ese día.</p>
                  {shownAvailability.nextAvailable && (
                    <Button
                      variant="outline"
                      className="self-start"
                      onClick={() => {
                        const next = shownAvailability.nextAvailable;
                        if (!next) return;
                        setDate(toBusinessDayKey(next.startAt));
                        setSelectedSlot(next.startAt);
                      }}
                    >
                      <CalendarCheck size={14} aria-hidden="true" />
                      Ir al próximo disponible:{" "}
                      {formatDayHour(
                        shownAvailability.nextAvailable.startAt,
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {shownAvailability?.slots.map((slot) => (
                    <button
                      key={slot.startAt}
                      type="button"
                      onClick={() => setSelectedSlot(slot.startAt)}
                      aria-pressed={selectedSlot === slot.startAt}
                      className={
                        selectedSlot === slot.startAt
                          ? "border border-primary bg-primary/10 rounded-lg px-2 py-2 text-sm font-semibold transition-colors"
                          : "border border-border rounded-lg px-2 py-2 text-sm hover:border-primary transition-colors"
                      }
                    >
                      {formatHour(slot.startAt)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {bookError && (
            <div className="bg-card border border-destructive/50 rounded-2xl p-4">
              <p className="text-sm text-destructive">{bookError}</p>
              {suggestion && (
                <Button
                  variant="primaryBlock"
                  className="mt-3"
                  disabled={isBooking}
                  onClick={() => {
                    setSelectedSlot(suggestion);
                    handleConfirm(suggestion);
                  }}
                >
                  <CalendarCheck size={14} aria-hidden="true" />
                  Reservar {formatDayHour(suggestion)}
                </Button>
              )}
            </div>
          )}

          <Button
            variant="primaryBlock"
            disabled={!selectedSlot || isBooking}
            onClick={() => handleConfirm()}
          >
            {isBooking ? "Reservando..." : "Confirmar turno"}
          </Button>
        </div>
      )}
    </Section>
  );
}
