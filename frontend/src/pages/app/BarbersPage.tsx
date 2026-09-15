import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";
import { createBarberSchema } from "../../lib/schemas";
import { z } from "zod";
import axios from "axios";

type Barber = { id: string; name: string; email: string; role: string };
type CreateBarberInput = z.infer<typeof createBarberSchema>;

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
      const res = await api.get("/barbers");
      setBarbers(Array.isArray(res.data) ? res.data : res.data.barbers || []);
    } catch {
      // público, no debería fallar
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
      if (axios.isAxiosError(err)) {
        setServerError(
          err.response?.data?.error?.message || "Error al crear barbero",
        );
      } else {
        setServerError("Error inesperado");
      }
    }
  };

  return (
    <Section>
      <SectionHeader
        compact
        eyebrow="Panel — Admin"
        title="Barberos"
        highlight="equipo."
        description="Alta y listado de barberos."
        layout="split"
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
          <Input
            id="password"
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            withToggle
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
              {barbers.map((b) => (
                <li
                  key={b.id}
                  className="flex justify-between items-center border border-border rounded-lg px-3 py-2"
                >
                  <span className="text-sm font-medium">{b.name}</span>
                  <span className="text-xs text-muted">{b.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}
