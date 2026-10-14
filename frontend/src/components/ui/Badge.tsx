import { cn } from "../../lib/utils";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-[10px] uppercase tracking-widest text-muted border border-border rounded-full px-2 py-0.5",
        className,
      )}
    >
      {children}
    </span>
  );
}
