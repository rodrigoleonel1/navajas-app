import { cn } from "../../lib/utils";

// Estilos del <input>. Compartidos por Input y DateField.
export function inputClasses(hasError = false) {
  return cn(
    "w-full bg-background border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 transition-colors",
    hasError
      ? "border-destructive focus:border-destructive focus:ring-destructive"
      : "border-border focus:border-primary focus:ring-primary",
  );
}

// Botones de flecha ‹ ›: los del DateField y los del paginador.
export const arrowButtonClasses = cn(
  "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary cursor-pointer",
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border",
);
