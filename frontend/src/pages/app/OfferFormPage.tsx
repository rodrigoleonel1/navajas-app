import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Switch } from "../../components/ui/Switch";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../lib/api";
import { listServices, type Service } from "../../lib/appointments";
import { formatPrice } from "../../lib/format";
import {
  createOffer,
  listOffers,
  updateOffer,
  type Offer,
} from "../../lib/offers";

// Alta y edicion de ofertas. El formulario tiene varios bloques (servicios,
// fechas, estado), por eso vive en su propia pagina y no en un modal.
export function OfferFormPage() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [discount, setDiscount] = useState("10");
  const [selected, setSelected] = useState<string[]>([]);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const [serviceData, offerData] = await Promise.all([
          listServices(true),
          editing ? listOffers(true) : Promise.resolve<Offer[]>([]),
        ]);
        if (cancelled) return;
        setServices(serviceData);
        if (!editing) return;

        const found = offerData.find((item) => item.id === id) ?? null;
        if (!found) {
          setLoadError("Oferta no encontrada.");
          return;
        }

        const activeServiceIds = new Set(
          serviceData
            .filter((service) => service.active)
            .map((service) => service.id),
        );
        setOffer(found);
        setName(found.name);
        setDiscount(String(found.discountPercent));
        setSelected(
          found.serviceIds.filter((serviceId) =>
            activeServiceIds.has(serviceId),
          ),
        );
        setValidFrom(found.validFrom ?? "");
        setValidTo(found.validTo ?? "");
        setActive(found.active);
      } catch (err) {
        if (!cancelled) {
          setLoadError(getErrorMessage(err, "Error al cargar la oferta"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  const activeServices = services.filter((service) => service.active);
  const inactiveSelected =
    offer?.services.filter((service) => !service.active) ?? [];

  function toggleService(serviceId: string) {
    setSelected((prev) =>
      prev.includes(serviceId)
        ? prev.filter((item) => item !== serviceId)
        : [...prev, serviceId],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      setError("El nombre debe tener entre 2 y 50 caracteres");
      return;
    }
    if (selected.length === 0) {
      setError("Seleccioná al menos un servicio");
      return;
    }
    const percent = Number(discount);
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
      setError("El descuento debe ser un entero entre 1 y 100");
      return;
    }
    if (validFrom && validTo && validTo < validFrom) {
      setError("La fecha de fin no puede ser anterior a la de inicio");
      return;
    }

    setError("");
    setSaving(true);
    try {
      const payload = {
        name: trimmedName,
        serviceIds: selected,
        discountPercent: percent,
        validFrom: validFrom || null,
        validTo: validTo || null,
        active,
      };
      if (offer) {
        await updateOffer(offer.id, payload);
        toast.success("Oferta actualizada");
      } else {
        await createOffer(payload);
        toast.success("Oferta creada");
      }
      navigate("/app/admin/ofertas");
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al guardar la oferta"));
    } finally {
      setSaving(false);
    }
  }

  const backLink = (
    <Link
      to="/app/admin/ofertas"
      className="mt-4 inline-flex items-center gap-1 text-primary text-xs font-semibold tracking-wide hover:opacity-80 transition-opacity"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      Volver al listado
    </Link>
  );

  if (loading) {
    return (
      <Section>
        <SectionHeader
          eyebrow="Panel — Admin"
          title={editing ? "Editar" : "Nueva"}
          highlight="oferta."
          description="Descuentos automáticos sobre servicios o combinaciones exactas."
        />
        <Loader label="Cargando oferta..." height="page" />
      </Section>
    );
  }

  if (loadError) {
    return (
      <Section>
        <SectionHeader
          eyebrow="Panel — Admin"
          title={editing ? "Editar" : "Nueva"}
          highlight="oferta."
          description="Descuentos automáticos sobre servicios o combinaciones exactas."
        />
        <p className="mt-6 text-sm text-destructive">{loadError}</p>
        {backLink}
      </Section>
    );
  }

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title={editing ? "Editar" : "Nueva"}
        highlight="oferta."
        description="Descuentos automáticos sobre servicios o combinaciones exactas."
      />
      {backLink}

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 grid gap-6 lg:grid-cols-2"
      >
        <div className="flex flex-col gap-4 bg-card border border-border rounded-2xl p-6">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
            Datos de la oferta
          </h3>
          <Input
            id="offer-name"
            label="Nombre"
            placeholder="25% en corte"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            id="offer-discount"
            label="Descuento (%)"
            type="number"
            min={1}
            max={100}
            step={1}
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="offer-valid-from"
              label="Desde (opcional)"
              type="date"
              value={validFrom}
              onChange={(event) => setValidFrom(event.target.value)}
            />
            <Input
              id="offer-valid-to"
              label="Hasta (opcional)"
              type="date"
              value={validTo}
              onChange={(event) => setValidTo(event.target.value)}
            />
          </div>
          <p className="text-xs text-muted">
            Las fechas son informativas: la oferta se aplica mientras esté
            activa.
          </p>
          <div className="border-t border-border pt-4">
            <Switch
              id="offer-active"
              label="Oferta activa"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 bg-card border border-border rounded-2xl p-6">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
            Servicios
          </h3>
          {activeServices.length === 0 ? (
            <p className="text-sm text-muted">
              No hay servicios activos para ofertar.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {activeServices.map((service) => (
                <li key={service.id}>
                  <label className="flex items-center justify-between gap-3 border border-border rounded-lg px-3 py-2 cursor-pointer has-checked:border-primary transition-colors">
                    <span className="flex min-w-0 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                        className="accent-primary h-4 w-4 shrink-0"
                      />
                      <span className="truncate text-sm font-medium">
                        {service.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">
                      {formatPrice(service.price)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted">
            La oferta se aplica solo si el cliente elige exactamente estos
            servicios.
          </p>
          {inactiveSelected.length > 0 && (
            <p className="text-xs text-destructive">
              Esta oferta incluye servicios inactivos (
              {inactiveSelected.map((service) => service.name).join(", ")}). Se
              quitarán al guardar.
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive lg:col-span-2">{error}</p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end lg:col-span-2">
          <Button
            type="button"
            variant="outline"
            className="justify-center"
            onClick={() => navigate("/app/admin/ofertas")}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primaryBlock"
            className="sm:w-auto sm:px-8"
            disabled={saving}
          >
            {saving
              ? "Guardando..."
              : offer
                ? "Guardar cambios"
                : "Crear oferta"}
          </Button>
        </div>
      </form>
    </Section>
  );
}
