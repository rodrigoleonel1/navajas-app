import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight } from "lucide-react";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api, getErrorMessage } from "../../lib/api";
import { serviceSchema, type ServiceInput } from "../../lib/schemas";
import { listServices, type Service } from "../../lib/appointments";

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");
  const [listError, setListError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
  });

  useEffect(() => {
    let cancelled = false;
    async function loadServices() {
      setListError("");
      try {
        const data = await listServices(showInactive);
        if (!cancelled) setServices(data);
      } catch (err) {
        if (!cancelled) {
          setServices([]);
          setListError(getErrorMessage(err, "Error al cargar servicios"));
        }
      }
    }
    loadServices();
    return () => {
      cancelled = true;
    };
  }, [showInactive, refreshKey]);

  const onSubmit = async (data: ServiceInput) => {
    setServerError("");
    setSuccess("");
    try {
      await api.post("/services", data);
      setSuccess("Servicio creado");
      reset();
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setServerError(getErrorMessage(err, "Error al crear servicio"));
    }
  };

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Servicios"
        highlight="catálogo."
        description="Alta y listado de servicios."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4 bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
            Alta servicio
          </h3>
          <Input
            id="name"
            label="Nombre"
            placeholder="Corte clásico"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            id="duration"
            label="Duración (minutos)"
            type="number"
            min={1}
            placeholder="30"
            error={errors.duration?.message}
            {...register("duration", { valueAsNumber: true })}
          />
          <Input
            id="price"
            label="Precio"
            type="number"
            min={1}
            placeholder="15000"
            error={errors.price?.message}
            {...register("price", { valueAsNumber: true })}
          />
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
          {success && <p className="text-sm text-primary">{success}</p>}
          <Button
            variant="primaryBlock"
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creando..." : "Crear servicio"}
          </Button>
        </form>

        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
              Listado ({services.length})
            </h3>
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="accent-primary h-4 w-4"
              />
              Ver inactivos
            </label>
          </div>
          {listError && (
            <p className="text-sm text-destructive mb-4">{listError}</p>
          )}
          {services.length === 0 ? (
            <p className="text-sm text-muted">
              {listError ? "Reintentá recargando la página." : "No hay servicios aún."}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {services.map((service) => (
                <li
                  key={service.id}
                  className="flex justify-between items-center gap-2 border border-border rounded-lg px-3 py-2"
                >
                  <span className="flex flex-col">
                    <span className="text-sm font-medium flex items-center gap-2">
                      {service.name}
                      {!service.active && (
                        <span className="text-[10px] uppercase tracking-widest text-muted border border-border rounded-full px-2 py-0.5">
                          Inactivo
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted">
                      {service.duration} min — $
                      {service.price.toLocaleString("es-AR")}
                    </span>
                  </span>
                  <Button
                    variant="outline"
                    href={`/app/services/${service.id}`}
                    aria-label={`Ver detalle de ${service.name}`}
                  >
                    Detalle
                    <ArrowUpRight
                      size={14}
                      aria-hidden="true"
                      className="opacity-60"
                    />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}
