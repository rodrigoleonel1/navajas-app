import { MoreVertical } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const MENU_WIDTH = 176;
const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;

export type MenuItem = {
  label: string;
  danger?: boolean;
  onSelect: () => void;
};

export function AppointmentMenu({
  items,
  busy = false,
  ariaLabel = "Acciones",
}: {
  items: MenuItem[];
  busy?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const anchorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onScrollOrResize(event: Event) {
      // No cerrar si el scroll ocurre dentro del propio menú.
      if (
        event.type === "scroll" &&
        menuRef.current?.contains(event.target as Node)
      ) {
        return;
      }
      setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  // Antes de pintar, medimos el menú y lo abrimos hacia arriba si abajo no
  // entra. Así un kebab cerca del borde inferior no queda cortado.
  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !menuRef.current) return;

    const anchor = anchorRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();

    const spaceBelow = window.innerHeight - anchor.bottom - MENU_GAP;
    const spaceAbove = anchor.top - MENU_GAP - VIEWPORT_MARGIN;
    const openUp = menu.height > spaceBelow && spaceAbove > spaceBelow;

    const top = openUp
      ? Math.max(VIEWPORT_MARGIN, anchor.top - MENU_GAP - menu.height)
      : Math.min(
          anchor.bottom + MENU_GAP,
          Math.max(VIEWPORT_MARGIN, window.innerHeight - MENU_GAP - menu.height),
        );

    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, anchor.right - MENU_WIDTH),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN),
    );

    setCoords((prev) =>
      prev && prev.top === top && prev.left === left ? prev : { top, left },
    );
  }, [open, items.length]);

  if (items.length === 0) return null;

  function toggle() {
    if (!open && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + MENU_GAP,
        left: Math.max(8, rect.right - MENU_WIDTH),
      });
    }
    setOpen((value) => !value);
  }

  return (
    <span ref={anchorRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={toggle}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-muted/40 bg-background/50 text-muted transition-colors hover:border-primary hover:text-foreground disabled:opacity-50 cursor-pointer"
      >
        <MoreVertical size={16} aria-hidden="true" />
      </button>
      {open && coords && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <span
            ref={menuRef}
            role="menu"
            style={{
              top: coords.top,
              left: coords.left,
              maxHeight: `calc(100dvh - ${VIEWPORT_MARGIN * 2}px)`,
              maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
            }}
            className="fixed z-20 w-44 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={
                  item.danger
                    ? "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10 cursor-pointer"
                    : "flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10 cursor-pointer"
                }
              >
                {item.label}
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  );
}
