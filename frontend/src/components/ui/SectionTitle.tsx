type As = "h1" | "h2";

type SectionTitleProps = {
  title: string;
  highlight: string;
  as?: As;
  className?: string;
};

export function SectionTitle({
  title,
  highlight,
  as = "h2",
  className = "",
}: SectionTitleProps) {
  const base = `font-barlow font-extrabold tracking-tight leading-[0.85] uppercase text-foreground text-6xl md:text-7xl`;
  const classes = `${base} ${className}`.trim();

  const content = (
    <>
      {title}
      <br />
      <span className="text-stroke">{highlight}</span>
    </>
  );

  if (as === "h1") {
    return <h1 className={classes}>{content}</h1>;
  }
  return <h2 className={classes}>{content}</h2>;
}
