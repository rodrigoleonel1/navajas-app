import { useState } from "react";
import { useToast } from "../hooks/useToast";
import { getErrorMessage } from "../lib/api";
import type { Service } from "../lib/appointments";
import { formatPrice } from "../lib/format";
import {
  createOffer,
  updateOffer,
  type Offer,
} from "../lib/offers";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";
import { Switch } from "./ui/Switch";

export function OfferFormModal({
  offer = null,
  services,
  onClose,
  onSaved,
}: {
  offer?: Offer | null;
  services: Service[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const activeServices = services.filter((service) => service.active);
  const inactiveSelected =
    offer?.services.filter((service) => !service.active) ?? [];
  const activeServiceIds = new Set(activeServices.map((service) => service.id));

  const [name, setName] = useState(offer?.name ?? "");
  const [discount, setDiscount] = useState(
    offer ? String(offer.discountPercent) : "10",
  );
  const [selected, setSelected] = useState<string[]>(
    offer ? offer.serviceIds.filter((id) => activeServiceIds.has(id)) : [],
  );
  const [validFrom, setValidFrom] = useState(offer?.validFrom ?? "");
  const [validTo, setValidTo] = useState(offer?.validTo ?? "");
  const [active, setActive] = useState(offer?.active ?? true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleService(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
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
      onSaved();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al guardar la oferta"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={offer ? "Editar oferta" : "Nueva oferta"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
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

        <div className="flex flex-col gap-2">
          <p className="font-barlow text-xs font-semibold tracking-widest uppercase text-muted-light">
            Servicios
          </p>
          {activeServices.length === 0 ? (
            <p className="text-sm text-muted">
              No hay servicios activos para ofertar.
            </p>
          ) : (
            <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
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
          Las fechas son informativas: la oferta se aplica mientras esté activa.
        </p>

        <Switch
          id="offer-active"
          label="Oferta activa"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button variant="primaryBlock" disabled={saving}>
          {saving
            ? "Guardando..."
            : offer
              ? "Guardar cambios"
              : "Crear oferta"}
        </Button>
      </form>
    </Modal>
  );
}
