import { useState, useCallback } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { BrandLogo } from "../ui/BrandLogo";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";

const NAV_LINKS = [
  { href: "#servicios", label: "Servicios", index: "01" },
  { href: "#nosotros", label: "Nosotros", index: "02" },
  { href: "#trabajos", label: "Trabajos", index: "03" },
] as const;

export function Navbar() {
  const [open, setOpen] = useState(false);

  useLockBodyScroll(open);

  const close = useCallback(() => setOpen(false), []);

  return (
    <nav
      className="flex items-center justify-between w-full sticky top-0 z-100 bg-surface/80 backdrop-blur-lg border-b border-white/6 p-5 md:px-shell"
      aria-label="Navegación principal"
    >
      <BrandLogo className="relative z-102" />

      {/* Menu pc */}
      <div className="hidden md:flex gap-8 font-barlow tracking-widest uppercase">
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="hover:text-primary transition-all duration-200"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Menu mobile */}
      <div className="flex items-center gap-4">
        <Button variant="outline" href="./login.html">
          Reservar{" "}
          <ArrowUpRight size={14} className="opacity-60" aria-hidden="true" />
        </Button>
        <button
          className=" flex items-center justify-center md:hidden w-7 h-7   cursor-pointer relative z-102"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Menu
            aria-hidden="true"
            className={cn(
              " absolute transition-all duration-200 ease-out",
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

      <div
        id="mobile-menu"
        role="menu"
        className={cn(
          open ? "flex" : "hidden",
          "flex-col justify-start fixed inset-0 h-dvh bg-background pt-22 px-5  z-101 md:hidden",
        )}
      >
        <p className="mb-4 font-jetbrains text-xs tracking-widest uppercase text-muted-2">
          Navegación / 01 — {String(NAV_LINKS.length).padStart(2, "0")}
        </p>
        {NAV_LINKS.map((link, i) => (
          <a
            key={link.href}
            href={link.href}
            role="menuitem"
            onClick={close}
            className={`grid grid-cols-[2.5rem_1fr_auto] items-center py-4 font-barlow text-3xl font-extrabold tracking-wide uppercase border-b ${i === 0 ? "border-t border-border" : "border-border-subtle"}`}
          >
            <span className="font-jetbrains text-[0.65rem] font-medium text-primary">
              {link.index}
            </span>
            <span>{link.label}</span>
            <ArrowUpRight size={16} className="opacity-50" aria-hidden="true" />
          </a>
        ))}
        <Button
          variant="primaryBlock"
          href="./login.html"
          className="mt-6"
          onClick={close}
        >
          Reservar <ArrowUpRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
