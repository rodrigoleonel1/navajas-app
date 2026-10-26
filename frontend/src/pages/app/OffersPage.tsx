import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppointmentMenu } from "../../components/AppointmentMenu";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ListCard } from "../../components/ui/ListCard";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Switch } from "../../components/ui/Switch";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../lib/api";
import { formatDateKey } from "../../lib/datetime";
import { listOffers, updateOffer, type Offer } from "../../lib/offers";

// Vigencia informativa de la promo (no condiciona la aplicación).
function validityLabel(offer: Offer): string {
  if (offer.validFrom && offer.validTo) {
    return `${formatDateKey(offer.validFrom)} — ${formatDateKey(offer.validTo)}`;
  }
  if (offer.validFrom) return `Desde ${formatDateKey(offer.validFrom)}`;
  if (offer.validTo) return `Hasta ${formatDateKey(offer.validTo)}`;
  return "Sin fechas";
}

function servicesLabel(offer: Offer): string {
  if (offer.services.length === 0) return "—";
  return offer.services.map((service) => service.name).join(" + ");
}

export function OffersPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setListError("");
      try {
        const offerData = await listOffers(showInactive);
        if (!cancelled) {
          setOffers(offerData);
        }
      } catch (err) {
        if (!cancelled) {
          setOffers([]);
          setListError(getErrorMessage(err, "Error al cargar ofertas"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [showInactive, refreshKey]);

  async function handleToggle(offer: Offer) {
    const nextActive = !offer.active;
    setTogglingId(offer.id);
    try {
      await updateOffer(offer.id, { active: nextActive });
      toast.success(nextActive ? "Oferta activada" : "Oferta desactivada");
      setRefreshKey((key) => key + 1);
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al cambiar estado"));
    } finally {
      setTogglingId(null);
    }
  }

  function offerMenuItems(offer: Offer) {
    return [
      {
        label: "Editar oferta",
        onSelect: () => navigate(`/app/offers/${offer.id}/edit`),
      },
      offer.active
        ? {
            label: "Desactivar",
            danger: true,
            onSelect: () => handleToggle(offer),
          }
        : {
            label: "Reactivar",
            onSelect: () => handleToggle(offer),
          },
    ];
  }

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Ofertas"
        highlight="y combos."
        description="Descuentos automáticos sobre servicios o combinaciones exactas."
      />

      <div className="mt-8 bg-card border border-border rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mr-auto">
            Listado ({offers.length})
          </h3>
          <Switch
            id="show-inactive-offers"
            label="Ver inactivas"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          <div className="w-full sm:w-auto sm:flex sm:justify-end">
            <Button
              variant="primaryBlock"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => navigate("/app/offers/new")}
            >
              <Plus size={16} aria-hidden="true" />
              Agregar oferta
            </Button>
          </div>
        </div>
        {listError && (
          <p className="text-sm text-destructive mb-4">{listError}</p>
        )}
        {loading ? (
          <Loader label="Cargando ofertas..." height="card" />
        ) : offers.length === 0 ? (
          <p className="text-sm text-muted">
            {listError
              ? "Reintentá recargando la página."
              : "No hay ofertas aún."}
          </p>
        ) : (
          <>
            <div className="hidden lg:block overflow-hidden rounded-xl border border-border bg-background">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted">
                    <th className="px-4 py-3 font-semibold">Nombre</th>
                    <th className="px-4 py-3 font-semibold">Servicios</th>
                    <th className="px-4 py-3 font-semibold">Descuento</th>
                    <th className="px-4 py-3 font-semibold">Vigencia</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {offers.map((offer) => (
                    <tr
                      key={offer.id}
                      className="border-b border-border last:border-0 transition-colors hover:bg-primary/5"
                    >
                      <td className="px-4 py-3 font-medium">{offer.name}</td>
                      <td className="px-4 py-3 text-muted">
                        {servicesLabel(offer)}
                      </td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">
                        {offer.discountPercent}%
                      </td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">
                        {validityLabel(offer)}
                      </td>
                      <td className="px-4 py-3">
                        {offer.active ? (
                          <Badge tone="success">Activa</Badge>
                        ) : (
                          <Badge tone="danger">Inactiva</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AppointmentMenu
                          ariaLabel={`Acciones de ${offer.name}`}
                          busy={togglingId === offer.id}
                          items={offerMenuItems(offer)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="grid items-start gap-3 sm:grid-cols-2 lg:hidden">
              {offers.map((offer) => (
                <ListCard
                  key={offer.id}
                  title={`${offer.discountPercent}% — ${offer.name}`}
                  actions={
                    <AppointmentMenu
                      ariaLabel={`Acciones de ${offer.name}`}
                      busy={togglingId === offer.id}
                      items={offerMenuItems(offer)}
                    />
                  }
                  subtitle={servicesLabel(offer)}
                  detail={validityLabel(offer)}
                  footerRight={
                    <Badge tone={offer.active ? "success" : "danger"}>
                      {offer.active ? "Activa" : "Inactiva"}
                    </Badge>
                  }
                />
              ))}
            </ul>
          </>
        )}
      </div>
    </Section>
  );
}
