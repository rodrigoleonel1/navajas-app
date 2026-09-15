import { useCallback, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { cn } from "../lib/utils";
import { BrandLogo } from "./ui/BrandLogo";
import { Button } from "./ui/Button";
import { MobileNavLink } from "./ui/MobileNavLink";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function AppNavbar() {
  const navigate = useNavigate();
  const user = getUser();
  const role = user?.role as string | undefined;
  const [open, setOpen] = useState(false);
  useLockBodyScroll(open);
  const close = useCallback(() => setOpen(false), []);

  const links =
    role === "admin"
      ? [
          { to: "/app/agenda", label: "Agenda", index: "01" },
          { to: "/app/barbers", label: "Barberos", index: "02" },
        ]
      : role === "barber"
        ? [
            { to: "/app/agenda", label: "Agenda", index: "01" },
            { to: "/app/barber/ingresos", label: "Ingresos", index: "02" },
          ]
        : [
            { to: "/app/agenda", label: "Reservar", index: "01" },
            { to: "/app/client/turnos", label: "Mis turnos", index: "02" },
          ];

  const handleLogout = () => {
    close();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <nav
      className="flex items-center justify-between w-full sticky top-0 z-100 bg-surface/80 backdrop-blur-lg border-b border-white/6 p-5 md:px-shell"
      aria-label="Navegación app"
    >
      <BrandLogo className="relative z-102" href="/app/agenda" />

      {/* Desktop */}
      <div className="hidden md:flex gap-8 font-barlow tracking-widest uppercase">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="hover:text-primary transition-all duration-200"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden md:inline text-xs text-muted">
          {user?.email}
        </span>
        <Button
          variant="outline"
          className="hidden md:inline-flex"
          onClick={handleLogout}
        >
          Salir <LogOut size={14} className="opacity-60" aria-hidden="true" />
        </Button>

        <button
          className="flex items-center justify-center md:hidden w-7 h-7 cursor-pointer relative z-102"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="mobile-menu-app"
          onClick={() => setOpen((v) => !v)}
        >
          <Menu
            aria-hidden="true"
            className={cn(
              "absolute transition-all duration-200 ease-out",
              open
                ? "opacity-0 rotate-90 scale-75"
                : "opacity-90 rotate-0 scale-100",
            )}
          />
          <X
            aria-hidden="true"
            className={cn(
              "transition-all duration-200 ease-out",
              open
                ? "opacity-90 rotate-0 scale-100"
                : "opacity-0 -rotate-90 scale-75",
            )}
          />
        </button>
      </div>

      {/* Mobile */}
      <div
        id="mobile-menu-app"
        role="menu"
        className={cn(
          open ? "flex" : "hidden",
          "flex-col justify-start fixed inset-0 h-dvh bg-background pt-22 px-5 z-101 md:hidden",
        )}
      >
        <p className="mb-4 font-jetbrains text-xs tracking-widest uppercase text-muted-2">
          Navegación / {role || "app"} — {String(links.length).padStart(2, "0")}
        </p>
        {links.map((link, i) => (
          <MobileNavLink
            key={link.to}
            to={link.to}
            label={link.label}
            index={link.index}
            isFirst={i === 0}
            onClick={close}
          />
        ))}
        <p className="mt-6 text-xs text-muted">{user?.email}</p>
        <Button variant="primaryBlock" className="mt-6" onClick={handleLogout}>
          Salir <LogOut size={14} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
