import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "../hooks/useToast";
import { api, getErrorMessage } from "../lib/api";
import { serviceSchema, type ServiceInput } from "../lib/schemas";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";

export function ServiceCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
  });

  const onSubmit = async (data: ServiceInput) => {
    try {
      await api.post("/services", data);
      toast.success("Servicio creado");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al crear servicio"));
    }
  };

  return (
    <Modal title="Agregar servicio" onClose={onClose}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
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
        <Button variant="primaryBlock" disabled={isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear servicio"}
        </Button>
      </form>
    </Modal>
  );
}
