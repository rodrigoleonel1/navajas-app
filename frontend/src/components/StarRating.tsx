import { Star } from "lucide-react";
import { cn } from "../lib/utils";

// Estrellas de 1 a 5. Con onChange es interactivo (selector); sin onChange
// solo muestra la nota recibida.
export function StarRating({
  value,
  onChange,
  size = 18,
  className,
}: {
  value: number | null;
  onChange?: (score: number) => void;
  size?: number;
  className?: string;
}) {
  const interactive = typeof onChange === "function";
  const filled = value ?? 0;

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={interactive ? "radiogroup" : "img"}
      aria-label={
        interactive
          ? "Calificación de 1 a 5 estrellas"
          : `${filled} de 5 estrellas`
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
