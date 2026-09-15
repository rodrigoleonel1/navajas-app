import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "./ui/BrandLogo";
import { Button } from "./ui/Button";
import { MobileNavLink } from "./ui/MobileNavLink";
import { NavShell } from "./ui/NavShell";
import { useMobileMenu } from "../hooks/useMobileMenu";

const NAV_LINKS = [
  { href: "/#servicios", label: "Servicios", index: "01" },
  { href: "/#nosotros", label: "Nosotros", index: "02" },
  { href: "/#trabajos", label: "Trabajos", index: "03" },
] as const;

export function Navbar() {
  const { open, close, toggle } = useMobileMenu();

  const desktop = NAV_LINKS.map((link) => (
    <a
      key={link.href}
      href={link.href}
      className="hover:text-primary transition-all duration-200"
    >
      {link.label}
    </a>
  ));

  const actions = (
    <Button variant="outline" href="/login">
      Reservar{" "}
      <ArrowUpRight size={14} className="opacity-60" aria-hidden="true" />
    </Button>
  );

  const mobileLinks = (
    <>
      {NAV_LINKS.map((link) => (
        <MobileNavLink
          key={link.href}
          to={link.href}
          label={link.label}
          index={link.index}
          onClick={close}
        />
      ))}
      <Button
        variant="primaryBlock"
        href="/login"
        className="mt-6"
        onClick={close}
      >
        Reservar <ArrowUpRight size={14} aria-hidden="true" />
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
          Navegación / 01 — {String(NAV_LINKS.length).padStart(2, "0")}
        </p>
      }
    />
  );
}
