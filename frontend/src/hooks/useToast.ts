import { createContext, useContext } from "react";

export type ToastTone = "success" | "error";

export type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
};

export type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return ctx;
}
