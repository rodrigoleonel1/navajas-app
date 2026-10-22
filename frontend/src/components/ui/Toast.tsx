import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { ToastContext, type ToastItem, type ToastTone } from "../../hooks/useToast";
import { cn } from "../../lib/utils";

const DISMISS_MS = 4000;
const EXIT_MS = 200;
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [leaving, setLeaving] = useState<number[]>([]);
  const nextId = useRef(0);
  const dismissedRef = useRef<Set<number>>(new Set());

  const dismiss = useCallback((id: number) => {
    if (dismissedRef.current.has(id)) return;
    dismissedRef.current.add(id);
    setLeaving((prev) => [...prev, id]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      setLeaving((prev) => prev.filter((other) => other !== id));
    }, EXIT_MS);
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((prev) => [...prev, { id, tone, message }].slice(-MAX_VISIBLE));
      window.setTimeout(() => dismiss(id), DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-lg",
              leaving.includes(toast.id)
                ? "animate-toast-out"
                : "animate-toast-in",
            )}
          >
            {toast.tone === "success" ? (
              <CheckCircle2
                size={16}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-primary"
              />
            ) : (
              <AlertCircle
                size={16}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-destructive"
              />
            )}
            <p
              className={cn(
                "flex-1",
                toast.tone === "error" ? "text-destructive" : "text-foreground",
              )}
            >
              {toast.message}
            </p>
            <button
              type="button"
              aria-label="Cerrar aviso"
              onClick={() => dismiss(toast.id)}
              className="flex h-5 w-5 shrink-0 items-center justify-center text-muted transition-colors hover:text-foreground"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
