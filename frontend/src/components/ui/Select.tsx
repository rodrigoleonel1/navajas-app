import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  id: string;
  error?: string;
};

export function Select({
  label,
  id,
  className,
  error,
  children,
  ...props
}: SelectProps) {
  const hasError = !!error;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-barlow text-xs font-semibold tracking-widest uppercase text-muted-light"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={cn(
            "w-full appearance-none bg-background border rounded-lg pl-3 pr-10 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 transition-colors",
            hasError
              ? "border-destructive focus:border-destructive focus:ring-destructive"
              : "border-border focus:border-primary focus:ring-primary",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
      {hasError && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
