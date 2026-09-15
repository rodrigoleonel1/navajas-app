import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PasswordInput } from "../components/ui/PasswordInput";
import { SectionTitle } from "../components/ui/SectionTitle";
import { api, getErrorMessage } from "../lib/api";
import { loginSchema, type LoginInput } from "../lib/schemas";

export function LoginPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const isPending = isSubmitting;

  const onSubmit = async (data: LoginInput) => {
    setServerError("");
    try {
      const res = await api.post("/auth/login", data);
      const { token, user } = res.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      // CA-2: redirect por rol
      if (user.role === "admin") navigate("/app/admin", { replace: true });
      else if (user.role === "barber")
        navigate("/app/barber", { replace: true });
      else navigate("/app/client", { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err, "Error al iniciar sesión"));
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-5 py-10 md:px-shell">
        <section className="w-full max-w-md bg-card border border-border rounded-2xl p-6 lg:p-8">
          <div className="mb-8">
            <p className="font-jetbrains text-xs tracking-widest uppercase text-muted-2 mb-2">
              Navajas — Acceso
            </p>
            <SectionTitle as="h1" title="Iniciar" highlight="sesión." />
            <p className="mt-2 text-sm text-muted">
              Ingresá con tu cuenta para reservar turnos.
            </p>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="hola@ejemplo.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <PasswordInput
              id="password"
              label="Contraseña"
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register("password")}
            />

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <Button
              variant="primaryBlock"
              className="mt-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isPending}
            >
              {isPending ? "Ingresando..." : "Ingresar"}{" "}
              {!isPending && <ArrowUpRight size={14} aria-hidden="true" />}
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-3 text-center">
            <p className="text-sm text-muted">
              ¿No tenés cuenta?{" "}
              <Link
                to="/signup"
                className="font-semibold text-primary hover:text-primary-low underline underline-offset-4 transition-colors"
              >
                Crear cuenta
              </Link>
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 font-barlow text-xs tracking-widest uppercase text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft size={14} aria-hidden="true" /> Volver al inicio
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
