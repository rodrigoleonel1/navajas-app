import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

const MENU_WIDTH = 176;
const MENU_GAP = 4;

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

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onScrollOrResize() {
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
  }, [open ]);

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
            role="menu"
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-20 w-44 rounded-xl border border-border bg-card p-1 shadow-lg"
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
