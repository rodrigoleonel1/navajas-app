type As = "h1" | "h2";

type SectionTitleProps = {
  title: string;
  highlight: string;
  as?: As;
  compact?: boolean;
  className?: string;
};

export function SectionTitle({
  title,
  highlight,
  as = "h2",
  compact,
  className = "",
}: SectionTitleProps) {
  const sizeClasses = compact ? "text-6xl md:text-7xl" : "text-7xl md:text-8xl";
  const base = `font-barlow font-extrabold tracking-tight leading-[0.85] uppercase text-foreground ${sizeClasses}`;
  const classes = `${base} ${className}`.trim();
  const hl = "text-stroke";

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
