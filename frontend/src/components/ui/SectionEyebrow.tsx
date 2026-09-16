type Tone = "muted" | "primary";

const toneClasses: Record<Tone, string> = {
  muted: "text-muted",
  primary: "text-primary",
};

type SectionEyebrowProps = {
  children: string;
  tone?: Tone;
  className?: string;
};

export function SectionEyebrow({
  children,
  tone = "muted",
  className = "",
}: SectionEyebrowProps) {
  const base = "mb-5 text-[0.65rem] tracking-widest font-semibold uppercase";
  const classes = `${base} ${toneClasses[tone]} ${className}`.trim();

  return <p className={classes}>{children}</p>;
}
