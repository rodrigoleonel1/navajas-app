import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type SectionProps = {
  id?: string;
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export function Section({
  id,
  className = "",
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn("px-5 md:px-shell w-full", className)}
      {...rest}
    >
      {children}
    </section>
  );
}
