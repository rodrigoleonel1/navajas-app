import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Input } from "../../components/ui/Input";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { Button } from "../../components/ui/Button";
import { api, getErrorMessage } from "../../lib/api";
import { createBarberSchema, type CreateBarberInput } from "../../lib/schemas";

type Barber = { id: string; name: string; email: string; role: string };

export function BarbersPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBarberInput>({
    resolver: zodResolver(createBarberSchema),
  });

  const fetchBarbers = async () => {
    try {
      const res = await api.get<Barber[] | { barbers: Barber[] }>("/barbers");
      const data = res.data;
      setBarbers(Array.isArray(data) ? data : data.barbers || []);
    } catch (err) {
      console.error("[barbers] fetch error", err);
    }
  };

  useEffect(() => {
    fetchBarbers();
  }, []);

  const onSubmit = async (data: CreateBarberInput) => {
    setServerError("");
    setSuccess("");
    try {
      await api.post("/barbers", data);
      setSuccess(`Barbero ${data.email} creado`);
      reset();
      fetchBarbers();
    } catch (err) {
      setServerError(getErrorMessage(err, "Error al crear barbero"));
    }
  };

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Barberos"
        highlight="equipo."
        description="Alta y listado de barberos."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4 bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
            Alta barbero
          </h3>
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
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
          {success && <p className="text-sm text-primary">{success}</p>}
          <Button
            variant="primaryBlock"
            className="rounded-lg disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creando..." : "Crear barbero"}
          </Button>
        </form>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
            Listado ({barbers.length})
          </h3>
          {barbers.length === 0 ? (
            <p className="text-sm text-muted">No hay barberos aún.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {barbers.map((barber) => (
                <li
                  key={barber.id}
                  className="flex justify-between items-center border border-border rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-medium">{barber.name}</span>
                  <span className="text-xs text-muted">{barber.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}
