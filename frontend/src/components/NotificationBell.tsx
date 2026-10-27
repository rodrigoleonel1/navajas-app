import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications";
import { useToast } from "../hooks/useToast";
import { formatDayHour } from "../lib/datetime";
import type { InAppNotification } from "../lib/notifications";
import { cn } from "../lib/utils";
import { Loader } from "./ui/Loader";

export function NotificationBell() {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    notifications,
    unread,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void refresh();
  };

  const handleOpen = (item: InAppNotification) => {
    setOpen(false);
    navigate(item.link || "/app/client/turnos");
    if (!item.readAt) {
      void markRead(item.id).catch(() => {
        toast.error("No se pudo marcar el aviso como leído");
      });
    }
  };

  const handleMarkAll = async () => {
    if (markingAll || unread === 0) return;
    setMarkingAll(true);
    try {
      await markAllRead();
    } catch {
      toast.error("No se pudieron marcar los avisos como leídos");
    } finally {
      setMarkingAll(false);
    }
  };

  const label =
    unread > 0 ? `Avisos, ${unread} sin leer` : "Avisos, todo al día";

  return (
    <div className="relative z-20">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
        className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-primary/50 hover:text-primary"
      >
        <Bell size={17} aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-background">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* El navbar tiene backdrop-blur: fixed se mide contra él, no contra el viewport. */}
          <button
            type="button"
            aria-label="Cerrar avisos"
            className="fixed inset-x-0 top-0 z-10 h-dvh cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Avisos"
            className="fixed left-4 right-4 top-20 z-20 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl md:absolute md:left-auto md:right-0 md:top-11 md:w-80"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p className="font-barlow text-sm font-semibold uppercase tracking-widest text-foreground">
                  Avisos
                </p>
                <p className="text-[11px] text-muted">
                  {unread > 0 ? `${unread} sin leer` : "Todo al día"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={unread === 0 || markingAll}
                className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-muted transition-colors hover:text-primary disabled:cursor-default disabled:opacity-40"
              >
                <CheckCheck size={14} aria-hidden="true" />
                Marcar todas
              </button>
            </div>

            <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
              {loading ? (
                <div className="px-6 py-8">
                  <Loader label="Cargando avisos" size="sm" />
                </div>
              ) : error ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-destructive">{error}</p>
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    className="mt-3 cursor-pointer text-[11px] font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Reintentar
                  </button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-muted">
                    No tenés avisos por ahora.
                  </p>
                </div>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpen(item)}
                    className={cn(
                      "flex w-full cursor-pointer gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-primary/5",
                      !item.readAt && "bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        item.readAt ? "bg-muted/30" : "bg-primary",
                      )}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {item.title}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-2">
                          {formatDayHour(item.createdAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                        {item.message}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
