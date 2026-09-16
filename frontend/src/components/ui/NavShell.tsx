import { Menu, X } from "lucide-react";
import { cn } from "../../lib/utils";
import type { ReactNode } from "react";

type NavShellProps = {
  brand: ReactNode;
  desktop: ReactNode;
  actions?: ReactNode;
  mobileLinks: ReactNode;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  mobileHeader?: ReactNode;
};

export function NavShell({
  brand,
  desktop,
  actions,
  mobileLinks,
  open,
  onToggle,
  mobileHeader,
}: NavShellProps) {
  return (
    <nav
      className="flex items-center justify-between w-full sticky top-0 z-100 bg-surface/80 backdrop-blur-lg border-b border-white/6 p-5 md:px-shell"
      aria-label="Navegación principal"
    >
      <div className="relative z-102">{brand}</div>

      <div className="hidden md:flex gap-8 font-barlow tracking-widest uppercase">
        {desktop}
      </div>

      <div className="flex items-center gap-4">
        {actions}
        <button
          className="flex items-center justify-center md:hidden w-7 h-7 cursor-pointer relative z-102"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={onToggle}
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

      <div
        id="mobile-menu"
        role="menu"
        className={cn(
          open ? "flex" : "hidden",
          "flex-col justify-start fixed inset-0 h-dvh bg-background pt-22 px-5 z-101 md:hidden",
        )}
      >
        {mobileHeader}
        {mobileLinks}
      </div>
    </nav>
  );
}
