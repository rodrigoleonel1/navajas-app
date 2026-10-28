import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../lib/api";
import {
  getServiceById,
  updateService,
  type Service,
} from "../../lib/appointments";
import { formatPrice } from "../../lib/format";
import { serviceSchema, type ServiceInput } from "../../lib/schemas";

export function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
          description: data.description ?? "",
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
    try {
      const updated = await updateService(id, data);
      setService(updated);
      toast.success("Servicio actualizado");
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al guardar servicio"));
    }
  };

  if (loading) {
    return (
      <Section>
        <SectionHeader
          eyebrow="Panel — Admin"
          title="Servicio"
          highlight="detalle."
          description="Detalle del servicio."
        />
        <Loader label="Cargando datos del servicio..." height="page" />
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
          to="/app/admin/servicios"
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
        description={`${service.duration} min — ${formatPrice(service.price)}`}
      />
      <Link
        to="/app/admin/servicios"
        className="mt-4 inline-flex items-center gap-1 text-primary text-xs font-semibold tracking-wide hover:opacity-80 transition-opacity"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Volver al listado
      </Link>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-6 flex flex-col gap-4 bg-card border border-border rounded-2xl p-6"
      >
        <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
          Editar servicio
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            id="name"
            label="Nombre"
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            id="description"
            label="Descripción"
            maxLength={120}
            error={errors.description?.message}
            {...register("description")}
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
        </div>
        <Button
          variant="primaryBlock"
          className="w-full sm:w-auto sm:self-end"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </Button>
      </form>
    </Section>
  );
}
