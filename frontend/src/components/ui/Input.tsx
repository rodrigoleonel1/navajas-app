import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  withToggle?: boolean;
  error?: string;
};

export function Input({
  label,
  id,
  className,
  type,
  withToggle,
  error,
  ...props
}: InputProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = withToggle && isPassword ? (show ? "text" : "password") : type;
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
        <input
          id={id}
          type={inputType}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={cn(
            "w-full bg-background border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 transition-colors",
            hasError
              ? "border-destructive focus:border-destructive focus:ring-destructive"
              : "border-border focus:border-primary focus:ring-primary",
            withToggle && isPassword && "pr-10",
            className,
          )}
          {...props}
        />
        {withToggle && isPassword && (
          <button
            type="button"
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShow((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            {show ? (
              <EyeOff size={16} aria-hidden="true" />
            ) : (
              <Eye size={16} aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {hasError && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
