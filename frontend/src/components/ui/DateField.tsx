import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftDayKey, toBusinessDayKey } from "../../lib/datetime";
import { arrowButtonClasses, inputClasses } from "./inputStyles";

// Campo de día con flechas para moverse un día hacia atrás/adelante.
export function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  function shift(days: number) {
    onChange(
      shiftDayKey(value || toBusinessDayKey(new Date().toISOString()), days),
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-barlow text-xs font-semibold tracking-widest uppercase text-muted-light"
      >
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Día anterior"
          onClick={() => shift(-1)}
          className={arrowButtonClasses}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <input
          id={id}
          type="date"
          value={value}
          onChange={(event) => event.target.value && onChange(event.target.value)}
          className={inputClasses()}
        />
        <button
          type="button"
          aria-label="Día siguiente"
          onClick={() => shift(1)}
          className={arrowButtonClasses}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
