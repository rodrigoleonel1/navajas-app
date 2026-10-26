import { formatRatingAverage } from "../lib/ratings";
import { StarRating } from "./StarRating";

// Resumen compacto del promedio de un barbero para el panel interno.
export function RatingSummary({
  average,
  count = 0,
  size = 14,
  className,
}: {
  average: number | null | undefined;
  count?: number;
  size?: number;
  className?: string;
}) {
  if (average == null) {
    return <span className={className}>Sin calificaciones</span>;
  }

  return (
    <span className={className}>
      <span className="inline-flex items-center gap-1.5">
        <StarRating value={Math.round(average)} size={size} />
        <span className="font-semibold">{formatRatingAverage(average)}</span>
        <span className="text-muted">({count})</span>
      </span>
    </span>
  );
}
