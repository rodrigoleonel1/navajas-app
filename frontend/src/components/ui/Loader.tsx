import { cn } from "../../lib/utils";

type LoaderSize = "sm" | "md" | "lg";
type LoaderHeight = "card" | "page";

const dotSizes: Record<LoaderSize, string> = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
};

const textSizes: Record<LoaderSize, string> = {
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-sm",
};

const heightClasses: Record<LoaderHeight, string> = {
  card: "min-h-[300px]",
  page: "min-h-[50vh]",
};

type LoaderProps = {
  label: string;
  size?: LoaderSize;
  height?: LoaderHeight;
  className?: string;
};

// Loader de área: cuatro puntos animados y el texto debajo.
export function Loader({
  label,
  size = "md",
  height,
  className,
}: LoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        height && heightClasses[height],
        className,
      )}
    >
      <div className="flex items-center gap-2" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={cn("loader-dot rounded-full bg-primary", dotSizes[size])}
            style={{ animationDelay: `${index * 0.15}s` }}
          />
        ))}
      </div>
      <p
        className={cn(
          "font-barlow font-semibold uppercase tracking-widest text-muted",
          textSizes[size],
        )}
      >
        {label}
      </p>
    </div>
  );
}
