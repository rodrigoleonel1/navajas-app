import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "../hooks/useToast";
import { api, getErrorMessage } from "../lib/api";
import { createBarberSchema, type CreateBarberInput } from "../lib/schemas";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";
import { PasswordInput } from "./ui/PasswordInput";

export function BarberCreateModal({
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
  } = useForm<CreateBarberInput>({
    resolver: zodResolver(createBarberSchema),
  });

  const onSubmit = async (data: CreateBarberInput) => {
    try {
      await api.post("/barbers", data);
      toast.success(`Barbero ${data.email} creado`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al crear barbero"));
    }
  };

  return (
    <Modal title="Agregar barbero" onClose={onClose}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          id="name"
          label="Nombre"
          placeholder="Juan Pérez"
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="barbero@navajas.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <PasswordInput
          id="password"
          label="Contraseña"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button variant="primaryBlock" disabled={isSubmitting}>
          {isSubmitting ? "Creando..." : "Crear barbero"}
        </Button>
      </form>
    </Modal>
  );
}
