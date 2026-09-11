type Size = "default" | "hero";
type HighlightVariant = "stroke" | "primary";
type As = "h1" | "h2";

const sizeClasses: Record<Size, string> = {
  default: "text-6xl",
  hero: "text-8xl md:text-9xl",
};

const highlightClasses: Record<HighlightVariant, string> = {
  stroke: "text-stroke",
  primary: "text-primary",
};

type SectionTitleProps = {
  title: string;
  highlight: string;
  as?: As;
  size?: Size;
  highlightVariant?: HighlightVariant;
  className?: string;
};

export function SectionTitle({
  title,
  highlight,
  as = "h2",
  size = "default",
  highlightVariant = "stroke",
  className = "",
}: SectionTitleProps) {
  const base =
    "font-barlow font-extrabold tracking-tight leading-[0.85] uppercase text-foreground";
  const classes = `${base} ${sizeClasses[size]} ${className}`.trim();
  const hl = highlightClasses[highlightVariant];

  const content = (
    <>
      {title}
      <br />
      <span className={hl}>{highlight}</span>
    </>
  );

  if (as === "h1") {
    return <h1 className={classes}>{content}</h1>;
  }
  return <h2 className={classes}>{content}</h2>;
}
