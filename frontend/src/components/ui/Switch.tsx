import { cn } from "../../lib/utils";

type SwitchProps = {
  id: string;
  label: string;
  className?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "id" | "type" | "className"
>;

// Switch de filtro: input real oculto + pista dibujada con peer-checked.
export function Switch({ id, label, className, disabled, ...props }: SwitchProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 text-xs text-muted transition-colors",
        "hover:text-foreground has-checked:text-foreground",
        disabled && "cursor-not-allowed opacity-40 hover:text-muted",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        disabled={disabled}
        className="peer sr-only"
        {...props}
      />
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full border border-border bg-surface transition-colors duration-200",
          "peer-checked:border-primary peer-checked:bg-primary",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40",
          "peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
          "peer-checked:[&>span]:translate-x-4 peer-checked:[&>span]:bg-background",
        )}
      >
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-muted-light transition-transform duration-200" />
      </span>
      {label}
    </label>
  );
}
