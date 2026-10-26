import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type NavShellProps = {
  brand: ReactNode;
  desktop: ReactNode;
  actions?: ReactNode;
  mobileLinks: ReactNode;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  mobileHeader?: ReactNode;
  /** Breakpoint desde el que se muestra el menú desktop. */
  desktopFrom?: "md" | "lg";
};

const DESKTOP_BREAKPOINT = {
  md: { desktop: "md:flex", hidden: "md:hidden" },
  lg: { desktop: "lg:flex", hidden: "lg:hidden" },
} as const;

export function NavShell({
  brand,
  desktop,
  actions,
  mobileLinks,
  open,
  onToggle,
  mobileHeader,
  desktopFrom = "md",
}: NavShellProps) {
  const breakpoint = DESKTOP_BREAKPOINT[desktopFrom];

  return (
    <nav
      className="flex items-center justify-between w-full sticky top-0 z-100 bg-surface/80 backdrop-blur-lg border-b border-white/6 p-5 md:px-shell"
      aria-label="Navegación principal"
    >
      <div className="relative z-102">{brand}</div>

      <div
        className={cn(
          "hidden gap-4 xl:gap-6 font-barlow tracking-widest uppercase",
          breakpoint.desktop,
        )}
      >
        {desktop}
      </div>

      <div className="flex items-center gap-4">
        {actions}
        <button
          className={cn(
            "flex items-center justify-center w-7 h-7 cursor-pointer relative z-102",
            breakpoint.hidden,
          )}
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
          "flex-col justify-start fixed inset-0 h-dvh bg-background pt-22 px-5 z-101",
          breakpoint.hidden,
        )}
      >
        {mobileHeader}
        {mobileLinks}
      </div>
    </nav>
  );
}
