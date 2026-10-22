import { ChevronLeft, ChevronRight } from "lucide-react";
import { arrowButtonClasses } from "./inputStyles";

type PagerProps = {
  page: number;
  totalPages: number | null;
  hasNext: boolean;
  loading?: boolean;
  onPage: (page: number) => void;
  label?: string;
  pageSize?: number;
  shown?: number;
  total?: number | null;
};

// Paginador ‹ Página X de Y › con resumen opcional "Mostrando 13–24 de 29".
export function Pager({
  page,
  totalPages,
  hasNext,
  loading = false,
  onPage,
  label,
  pageSize,
  shown,
  total,
}: PagerProps) {
  const count = shown ?? 0;
  const hasSummary =
    Boolean(label) &&
    total != null &&
    total > 0 &&
    count > 0 &&
    Boolean(pageSize);

  if (totalPages === 1 && !hasSummary) return null;

  const start = (page - 1) * (pageSize ?? 0) + 1;
  const end = Math.min(start + count - 1, total ?? start + count - 1);
  const range = start === end ? `${start}` : `${start}–${end}`;

  return (
    <div
      className={
        hasSummary
          ? "mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
          : "mt-6 flex items-center justify-center gap-4 border-t border-border pt-4"
      }
    >
      {hasSummary && (
        <p className="text-xs text-muted">
          Mostrando {range} de {total} {label}
        </p>
      )}
      {totalPages !== 1 && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label="Página anterior"
            disabled={page <= 1 || loading}
            onClick={() => onPage(Math.max(1, page - 1))}
            className={arrowButtonClasses}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span className="font-jetbrains text-xs text-muted">
            Página {page}
            {totalPages === null ? "" : ` de ${totalPages}`}
          </span>
          <button
            type="button"
            aria-label="Página siguiente"
            disabled={!hasNext || loading}
            onClick={() => onPage(page + 1)}
            className={arrowButtonClasses}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
