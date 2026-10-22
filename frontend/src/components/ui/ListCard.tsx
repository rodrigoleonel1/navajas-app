import { cn } from "../../lib/utils";

export function ListCard({
  title,
  titleClassName,
  actions,
  subtitle,
  detail,
  footerLeft,
  footerRight,
  faded = false,
}: {
  title: React.ReactNode;
  titleClassName?: string;
  actions?: React.ReactNode;
  subtitle?: React.ReactNode;
  detail?: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  faded?: boolean;
}) {
  return (
    <li className="rounded-xl border border-border bg-background px-4 py-3 flex flex-col gap-2">
      <span className="flex justify-between items-center gap-2">
        <span
          className={cn(
            "font-barlow font-bold text-xl leading-none",
            faded && "text-muted",
            titleClassName,
          )}
        >
          {title}
        </span>
        {actions}
      </span>
      {subtitle && (
        <span className={cn("text-sm font-medium", faded && "text-muted")}>
          {subtitle}
        </span>
      )}
      {detail && <span className="text-xs text-muted">{detail}</span>}
      <span className="border-t border-border pt-2 flex items-end justify-between gap-2">
        <span className={cn("font-jetbrains text-lg", faded && "text-muted")}>
          {footerLeft}
        </span>
        {footerRight}
      </span>
    </li>
  );
}
