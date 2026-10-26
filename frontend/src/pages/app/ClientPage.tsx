import { CalendarCheck, Clock } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../lib/api";
import {
  createAppointment,
  getAvailability,
  getConflictSuggestion,
  listBarbers,
  listServices,
  type Availability,
  type Barber,
  type Service,
} from "../../lib/appointments";
import {
  businessDayKeysFromToday,
  formatDateKey,
  formatDayHour,
  formatDayLabel,
  formatHour,
  toBusinessDayKey,
} from "../../lib/datetime";
import { formatPrice } from "../../lib/format";
import { listOffers, type Offer } from "../../lib/offers";
import { listVouchers, type Voucher } from "../../lib/vouchers";

function toLocalDateKey(date: Date): string {
  return toBusinessDayKey(date.toISOString());
}

export function ClientPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [activeVouchers, setActiveVouchers] = useState<Voucher[]>([]);
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
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

  useEffect(() => {
    let cancelled = false;
    listVouchers()
      .then((list) => {
        if (!cancelled) {
          setActiveVouchers(list.filter((voucher) => voucher.status === "active"));
        }
      })
      .catch(() => {
        if (!cancelled) setActiveVouchers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // RN11: el backend solo devuelve ofertas activas. La aplicación depende de
  // la oferta activa, no de las fechas de la promo.
  useEffect(() => {
    let cancelled = false;
    listOffers()
      .then((list) => {
        if (!cancelled) setActiveOffers(list);
      })
      .catch(() => {
        if (!cancelled) setActiveOffers([]);
      });
    return () => {
      cancelled = true;
    };
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

  // Tira de días: se desliza y centra el día elegido.
  const dayStripRef = useRef<HTMLDivElement>(null);
  const dayChipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Centra el día elegido (por ejemplo al usar "Ir al próximo disponible").
  useEffect(() => {
    const container = dayStripRef.current;
    const chip = dayChipRefs.current[date];
    if (!container || !chip) return;
    const containerRect = container.getBoundingClientRect();
    const chipRect = chip.getBoundingClientRect();
    container.scrollTo({
      left:
        container.scrollLeft +
        (chipRect.left - containerRect.left) -
        (container.clientWidth - chipRect.width) / 2,
      behavior: "smooth",
    });
  }, [date]);

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

  const totals = useMemo(() => {
    const chosen = services.filter((s) => serviceIds.includes(s.id));
    return {
      duration: chosen.reduce((acc, s) => acc + s.duration, 0),
      price: chosen.reduce((acc, s) => acc + s.price, 0),
    };
  }, [services, serviceIds]);

  // RN11: la oferta aplica solo con coincidencia exacta del conjunto de
  // servicios. Si hay varias, gana la de mayor descuento (no se acumulan).
  const matchingOffer = useMemo(() => {
    if (serviceIds.length === 0) return null;
    const key = [...serviceIds].sort().join(",");
    return activeOffers.reduce<Offer | null>((best, offer) => {
      if ([...offer.serviceIds].sort().join(",") !== key) return best;
      return !best || offer.discountPercent > best.discountPercent
        ? offer
        : best;
    }, null);
  }, [activeOffers, serviceIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const offerDiscount = matchingOffer
    ? Math.round((totals.price * matchingOffer.discountPercent) / 100)
    : 0;

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
      const voucherDiscount = appointment.voucherDiscount ?? 0;
      const offerDiscountApplied = appointment.offerDiscount ?? 0;
      const bookingNotes = [
        appointment.extra > 0 ? "recargo del 20%" : null,
        offerDiscountApplied > 0
          ? `oferta aplicada (-${formatPrice(offerDiscountApplied)})`
          : null,
        voucherDiscount > 0
          ? `vale aplicado (-${formatPrice(voucherDiscount)})`
          : null,
      ].filter(Boolean);
      toast.success(
        bookingNotes.length > 0
          ? `Turno reservado con ${bookingNotes.join(" y ")}.`
          : "Turno reservado",
      );
      navigate("/app/client/turnos");
    } catch (err) {
      const nextSuggestion = getConflictSuggestion(err);
      setSuggestion(nextSuggestion);
      if (nextSuggestion) {
        setBookError(getErrorMessage(err, "Horario no disponible"));
      } else {
        setBookError("");
        toast.error(getErrorMessage(err, "Error al reservar el turno"));
      }
    } finally {
      setIsBooking(false);
    }
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
        <Loader label="Cargando servicios..." height="page" />
      ) : (
        <div className="mt-8 flex w-full flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
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
                    <label className="flex justify-between items-center gap-3 border border-border rounded-lg px-3 py-2 cursor-pointer has-checked:border-primary transition-colors">
                      <span className="flex min-w-0 items-center gap-3">
                        <input
                          type="checkbox"
                          checked={serviceIds.includes(service.id)}
                          onChange={() => toggleService(service.id)}
                          className="accent-primary h-4 w-4 shrink-0"
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="text-sm font-medium">
                            {service.name}
                          </span>
                          <span className="text-xs text-muted inline-flex items-center gap-1 whitespace-nowrap">
                            <Clock
                              size={14}
                              aria-hidden="true"
                              className="opacity-60"
                            />
                            {service.duration} min
                          </span>
                        </span>
                      </span>
                      <span className="text-sm font-semibold shrink-0">
                        {formatPrice(service.price)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {totals.duration > 0 && (
              <div className="mt-3 flex flex-col gap-1 text-sm text-muted">
                <p>
                  Total: {totals.duration} min — {formatPrice(totals.price)}
                </p>
                {matchingOffer && (
                  <p className="text-primary font-medium">
                    Oferta “{matchingOffer.name}”:{" "}
                    {matchingOffer.services
                      .map((service) => service.name)
                      .join(" + ")}{" "}
                    → {formatPrice(Math.max(totals.price - offerDiscount, 0))}
                  </p>
                )}
              </div>
            )}
            {activeOffers.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs uppercase tracking-widest text-muted mb-2">
                  Ofertas vigentes
                </p>
                <ul className="flex flex-col gap-2">
                  {activeOffers.map((offer) => {
                    const applies = matchingOffer?.id === offer.id;
                    return (
                      <li
                        key={offer.id}
                        className={
                          applies
                            ? "flex items-start justify-between gap-3 text-xs text-primary font-semibold"
                            : "flex items-start justify-between gap-3 text-xs text-muted"
                        }
                      >
                        <span className="min-w-0">
                          <span className="block truncate">
                            {offer.name} ·{" "}
                            {offer.services
                              .map((service) => service.name)
                              .join(" + ")}
                          </span>
                          {(offer.validFrom || offer.validTo) && (
                            <span className="block text-[11px] font-normal">
                              {offer.validFrom
                                ? `Desde ${formatDateKey(offer.validFrom)}`
                                : ""}
                              {offer.validFrom && offer.validTo ? " — " : ""}
                              {offer.validTo
                                ? `Hasta ${formatDateKey(offer.validTo)}`
                                : ""}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0">
                          {offer.discountPercent}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-[11px] text-muted">
                  Se aplica solo si elegís exactamente los servicios de la
                  oferta.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
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
                ref={dayStripRef}
                className="flex gap-2 overflow-x-auto scroll-smooth scrollbar-thumb-only pb-2"
                role="group"
                aria-label="Elegir fecha"
              >
                {businessDayKeysFromToday(14).map((dayKey) => {
                  const disabled = stripNonWorkingDays.includes(dayKey);
                  const selected = date === dayKey;
                  return (
                    <button
                      key={dayKey}
                      ref={(element) => {
                        dayChipRefs.current[dayKey] = element;
                      }}
                      type="button"
                      disabled={disabled}
                      onClick={() => setDate(dayKey)}
                      aria-pressed={selected}
                      aria-label={`${formatDayLabel(dayKey)}${disabled ? " (no laborable)" : ""}`}
                      className={
                        selected
                          ? "shrink-0 border border-primary bg-primary/10 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
                          : disabled
                            ? "shrink-0 border border-border rounded-lg px-3 py-2 text-sm text-muted opacity-40 cursor-not-allowed"
                            : "shrink-0 border border-border rounded-lg px-3 py-2 text-sm hover:border-primary transition-colors"
                      }
                    >
                      {formatDayLabel(dayKey)}
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
                  <Loader
                    label="Buscando horarios..."
                    size="sm"
                    className="py-4"
                  />
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

            {activeVouchers.length > 0 && (
              <div className="bg-card border border-primary/40 rounded-2xl p-4">
                <p className="text-sm font-semibold text-primary">
                  Vale del {activeVouchers[0].discountPercent}% disponible
                </p>
                <p className="mt-1 text-xs text-muted">
                  {activeVouchers.length > 1
                    ? "Se aplicará el vale que vence primero al confirmar."
                    : "Se aplicará automáticamente al confirmar."}{" "}
                  Vence el{" "}
                  {formatDateKey(
                    toBusinessDayKey(activeVouchers[0].expiresAt),
                  )}
                  .
                </p>
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
        </div>
      )}
    </Section>
  );
}
