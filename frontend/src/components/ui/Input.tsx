import { cn } from "../../lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  error?: string;
};

export function Input({ label, id, className, error, ...props }: InputProps) {
  const hasError = !!error;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-barlow text-xs font-semibold tracking-widest uppercase text-muted-light">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${id}-error` : undefined}
        className={cn(
          "w-full bg-background border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 transition-colors",
          hasError ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-border focus:border-primary focus:ring-primary",
          className,
        )}
        {...props}
      />
      {hasError && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
