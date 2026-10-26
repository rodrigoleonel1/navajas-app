import { Star } from "lucide-react";
import { cn } from "../lib/utils";

// Estrellas de 1 a 5. Con onChange es interactivo (selector); sin onChange
// solo muestra la nota recibida. Con fractional el relleno de la ultima
// estrella se recorta al decimal del promedio (4.8 -> 80%).
export function StarRating({
  value,
  onChange,
  fractional = false,
  size = 18,
  className,
}: {
  value: number | null;
  onChange?: (score: number) => void;
  fractional?: boolean;
  size?: number;
  className?: string;
}) {
  const interactive = typeof onChange === "function";
  const filled = value ?? 0;
  const label =
    fractional && value != null
      ? `${value.toFixed(1)} de 5 estrellas`
      : `${filled} de 5 estrellas`;

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={interactive ? "radiogroup" : "img"}
      aria-label={
        interactive ? "Calificación de 1 a 5 estrellas" : label
      }
    >
      {[1, 2, 3, 4, 5].map((score) =>
        interactive ? (
          <button
            key={score}
            type="button"
            role="radio"
            aria-checked={value === score}
            aria-label={`${score} estrella${score === 1 ? "" : "s"}`}
            onClick={() => onChange(score)}
            className="cursor-pointer rounded-sm p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Star
              size={size}
              aria-hidden="true"
              className={
                score <= filled
                  ? "fill-primary text-primary"
                  : "text-muted/50"
              }
            />
          </button>
        ) : fractional ? (
          <PartialStar
            key={score}
            size={size}
            ratio={Math.min(1, Math.max(0, filled - (score - 1)))}
          />
        ) : (
          <Star
            key={score}
            size={size}
            aria-hidden="true"
            className={
              score <= filled ? "fill-primary text-primary" : "text-muted/30"
            }
          />
        ),
      )}
    </div>
  );
}

// Estrella con relleno proporcional: el contorno queda visible y el relleno
// se recorta por ancho para no necesitar un gradiente con id unico.
function PartialStar({ size, ratio }: { size: number; ratio: number }) {
  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
    >
      <Star
        size={size}
        aria-hidden="true"
        className="absolute inset-0 text-muted/30"
      />
      {ratio > 0 && (
        <span
          className="absolute left-0 top-0 h-full overflow-hidden"
          style={{ width: size * ratio }}
        >
          <Star
            size={size}
            aria-hidden="true"
            className="fill-primary text-primary"
          />
        </span>
      )}
    </span>
  );
}
