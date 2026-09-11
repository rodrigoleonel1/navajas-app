import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "outline" | "link" | "primaryBlock";

const variantClasses: Record<Variant, string> = {
  primary:
    "inline-flex items-center justify-center gap-1 px-6 py-3 text-xs font-semibold tracking-wide rounded-full bg-primary text-background hover:bg-primary-low transition-colors duration-200",
  secondary:
    "inline-flex items-center gap-1 px-6 py-3 bg-foreground text-background rounded-full  text-xs font-semibold tracking-wide hover:bg-white transition-colors duration-200",
  outline:
    "flex items-center gap-1 px-4 py-2 text-xs bg-transparent border border-muted/30 rounded-full font-medium tracking-wide transition-all duration-200 hover:bg-primary hover:text-background",
  link: "text-primary flex items-center font-semibold text-xs tracking-wide border-b border-primary/50 hover:border-primary transition-colors duration-200 w-fit",
  primaryBlock:
    "flex justify-center items-center bg-primary text-background py-3 text-sm font-semibold",
};

type ButtonProps = {
  variant?: Variant;
  href?: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">;

export function Button({
  variant = "primary",
  href,
  children,
  className = "",
  onClick,
  ...rest
}: ButtonProps) {
  const classes = cn(variantClasses[variant], className);

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        onClick={
          onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>
        }
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={classes}
      onClick={onClick}
      {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}
