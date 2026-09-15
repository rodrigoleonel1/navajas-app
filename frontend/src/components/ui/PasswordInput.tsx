import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  error?: string;
};

export function PasswordInput({ id, error, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-barlow text-xs font-semibold tracking-widest uppercase text-muted-light"
      >
        {props.label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full bg-background border rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 transition-colors ${error ? "border-destructive focus:border-destructive focus:ring-destructive" : "border-border focus:border-primary focus:ring-primary"}`}
          {...props}
        />
        <button
          type="button"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setShow((isOpen) => !isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          {show ? (
            <EyeOff size={16} aria-hidden="true" />
          ) : (
            <Eye size={16} aria-hidden="true" />
          )}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
