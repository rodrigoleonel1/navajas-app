import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./Button";
import { ConfirmContext, type ConfirmOptions } from "../../hooks/useConfirm";

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    if (resolverRef.current) {
      return Promise.resolve(false);
    }
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPending(options);
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setPending(null);
  }, []);

  useEffect(() => {
    if (!pending) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") settle(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pending, settle]);

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => settle(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={pending.title}
            className="animate-dialog-in w-full max-w-sm rounded-2xl border border-border bg-card p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
              {pending.title}
            </h3>
            <p className="mt-2 text-sm text-muted">{pending.message}</p>
            <div className="mt-6 flex gap-2">
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => settle(false)}
              >
                {pending.cancelLabel ?? "Volver"}
              </Button>
              <Button
                variant="primaryBlock"
                className="flex-1"
                autoFocus
                onClick={() => settle(true)}
              >
                {pending.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
