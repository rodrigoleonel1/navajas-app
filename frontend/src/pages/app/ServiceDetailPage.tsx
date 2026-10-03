import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { getErrorMessage } from "../../lib/api";
import { serviceSchema, type ServiceInput } from "../../lib/schemas";
import {
  getServiceById,
  updateService,
  type Service,
} from "../../lib/appointments";

export function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");

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
    async function load() {
      if (!id) return;
      try {
        const data = await getServiceById(id);
        if (cancelled) return;
        setService(data);
        reset({
          name: data.name,
          duration: data.duration,
          price: data.price,
        });
      } catch (err) {
        if (!cancelled) {
          setLoadError(getErrorMessage(err, "Error al cargar servicio"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, reset]);

  const onSubmit = async (data: ServiceInput) => {
    if (!id) return;
    setServerError("");
    setSuccess("");
    try {
      const updated = await updateService(id, data);
      setService(updated);
      setSuccess("Servicio actualizado");
    } catch (err) {
      setServerError(getErrorMessage(err, "Error al guardar servicio"));
    }
  };

  const setActive = async (active: boolean) => {
    if (!id) return;
    setServerError("");
    setSuccess("");
    try {
      const updated = await updateService(id, { active });
      setService(updated);
      setSuccess(active ? "Servicio activado" : "Servicio desactivado");
    } catch (err) {
      setServerError(getErrorMessage(err, "Error al cambiar estado"));
    }
  };

  if (loading) {
    return (
      <Section>
        <SectionHeader
          eyebrow="Panel — Admin"
          title="Servicio"
          highlight="detalle."
          description="Cargando datos del servicio."
        />
        <p className="mt-6 text-sm text-muted">Cargando...</p>
      </Section>
    );
  }

  if (loadError || !service) {
    return (
      <Section>
        <SectionHeader
          eyebrow="Panel — Admin"
          title="Servicio"
          highlight="detalle."
          description="No se pudo cargar el servicio."
        />
        <p className="mt-6 text-sm text-destructive">
          {loadError || "Servicio no encontrado."}
        </p>
        <Link
          to="/app/services"
          className="mt-4 inline-flex items-center gap-1 text-primary text-xs font-semibold tracking-wide hover:opacity-80 transition-opacity"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Volver al listado
        </Link>
      </Section>
    );
  }

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title={service.name}
        highlight="detalle."
        description={`${service.duration} min — $${service.price.toLocaleString("es-AR")}`}
      />
      <Link
        to="/app/services"
        className="mt-4 inline-flex items-center gap-1 text-primary text-xs font-semibold tracking-wide hover:opacity-80 transition-opacity"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Volver al listado
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4 bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
            Editar servicio
          </h3>
          <Input
            id="name"
            label="Nombre"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            id="duration"
            label="Duración (minutos)"
            type="number"
            min={1}
            error={errors.duration?.message}
            {...register("duration", { valueAsNumber: true })}
          />
          <Input
            id="price"
            label="Precio"
            type="number"
            min={1}
            error={errors.price?.message}
            {...register("price", { valueAsNumber: true })}
          />
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
          {success && <p className="text-sm text-primary">{success}</p>}
          <Button disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>

        <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-4">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
            Estado
          </h3>
          <p className="text-sm text-muted">
            {service.active
              ? "Visible en la reserva de los clientes."
              : "Oculto de la reserva de los clientes."}
          </p>
          {service.active ? (
            <Button variant="outline" onClick={() => setActive(false)}>
              Desactivar
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setActive(true)}>
              Activar
            </Button>
          )}
        </div>
      </div>
    </Section>
  );
}
