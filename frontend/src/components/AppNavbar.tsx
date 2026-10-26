import { LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMobileMenu } from "../hooks/useMobileMenu";
import { clearAuth, getUser } from "../lib/auth";
import { NotificationBell } from "./NotificationBell";
import { BrandLogo } from "./ui/BrandLogo";
import { Button } from "./ui/Button";
import { MobileNavLink } from "./ui/MobileNavLink";
import { NavShell } from "./ui/NavShell";

export function AppNavbar() {
  const navigate = useNavigate();
  const user = getUser();
  const role = user?.role as string | undefined;
  const { open, close, toggle } = useMobileMenu();

  // /app/agenda renderiza la agenda del rol logueado.
  const home = "/app/agenda";

  const links =
    role === "admin"
      ? [
          { to: "/app/agenda", label: "Agenda", index: "01" },
          { to: "/app/barbers", label: "Barberos", index: "02" },
          { to: "/app/services", label: "Servicios", index: "03" },
          { to: "/app/offers", label: "Ofertas", index: "04" },
          { to: "/app/holidays", label: "Feriados", index: "05" },
          {
            to: "/app/daily-earnings",
            label: "Liquidaciones",
            index: "06",
          },
          { to: "/app/reports", label: "Reportes", index: "07" },
          { to: "/app/voucher-config", label: "Config. vales", index: "08" },
        ]
      : role === "barber"
        ? [
            { to: "/app/agenda", label: "Agenda", index: "01" },
            { to: "/app/barber/ingresos", label: "Ingresos", index: "02" },
          ]
        : [
            { to: "/app/agenda", label: "Reservar", index: "01" },
            { to: "/app/client/turnos", label: "Mis turnos", index: "02" },
            { to: "/app/client/vales", label: "Vales", index: "03" },
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
      {role === "client" && <NotificationBell />}
      <span
        className={
          role === "admin"
            ? "hidden xl:inline text-xs text-muted"
            : "hidden md:inline text-xs text-muted"
        }
      >
        {user?.email}
      </span>
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
      desktopFrom={role === "admin" ? "lg" : "md"}
      brand={<BrandLogo className="relative z-102" to={home} />}
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
