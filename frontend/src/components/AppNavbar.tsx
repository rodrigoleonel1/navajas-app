import { LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "./ui/BrandLogo";
import { Button } from "./ui/Button";
import { MobileNavLink } from "./ui/MobileNavLink";
import { NavShell } from "./ui/NavShell";
import { useMobileMenu } from "../hooks/useMobileMenu";
import { clearAuth, getUser } from "../lib/auth";

export function AppNavbar() {
  const navigate = useNavigate();
  const user = getUser();
  const role = user?.role as string | undefined;
  const { open, close, toggle } = useMobileMenu();

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
    clearAuth();
    navigate("/login", { replace: true });
  };

  const desktop = links.map((link) => (
    <Link
      key={link.to}
      to={link.to}
      className="hover:text-primary transition-all duration-200"
    >
      {link.label}
    </Link>
  ));

  const actions = (
    <>
      <span className="hidden md:inline text-xs text-muted">{user?.email}</span>
      <Button
        variant="outline"
        className="hidden md:inline-flex"
        onClick={handleLogout}
      >
        Salir <LogOut size={14} className="opacity-60" aria-hidden="true" />
      </Button>
    </>
  );

  const mobileLinks = (
    <>
      {links.map((link) => (
        <MobileNavLink
          key={link.to}
          to={link.to}
          label={link.label}
          index={link.index}
          onClick={close}
        />
      ))}
      <p className="mt-6 text-xs text-muted">{user?.email}</p>
      <Button variant="primaryBlock" className="mt-6" onClick={handleLogout}>
        Salir <LogOut size={14} aria-hidden="true" />
      </Button>
    </>
  );

  return (
    <NavShell
      brand={<BrandLogo className="relative z-102" />}
      desktop={desktop}
      actions={actions}
      mobileLinks={mobileLinks}
      open={open}
      onToggle={toggle}
      onClose={close}
      mobileHeader={
        <p className="mb-4 font-jetbrains text-xs tracking-widest uppercase text-muted-2">
          Navegación / {role || "app"} — {String(links.length).padStart(2, "0")}
        </p>
      }
    />
  );
}
