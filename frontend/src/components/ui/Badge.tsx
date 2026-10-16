import { cn } from "../../lib/utils";

type BadgeTone = "muted" | "success" | "info" | "danger" | "primary" | "warning";

const toneClasses: Record<BadgeTone, string> = {
  muted: "text-muted border-border",
  success: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  info: "text-sky-400 border-sky-400/30 bg-sky-400/10",
  danger: "text-destructive border-destructive/30 bg-destructive/10",
  primary: "text-primary border-primary/30 bg-primary/10",
  warning: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
};

export function Badge({
  tone = "muted",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-[10px] uppercase tracking-widest border rounded-full px-2 py-0.5",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
