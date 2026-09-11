import { cn } from "../../lib/utils";

type BrandLogoProps = {
  href?: string;
  className?: string;
};

export function BrandLogo({ href = "#top", className }: BrandLogoProps) {
  return (
    <a
      href={href}
      aria-label="Navajas Barber inicio"
      className={cn("flex items-center gap-2", className)}
    >
      <span className="font-anton text-3xl tracking-tight">NB</span>
      <small className="border-l pl-2 text-[0.55rem] font-semibold tracking-widest leading-snug w-10">
        NAVAJAS BARBER
      </small>
    </a>
  );
}
