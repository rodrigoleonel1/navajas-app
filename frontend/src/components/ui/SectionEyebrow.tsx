type Tone = "muted" | "mutedLight" | "primary";

const toneClasses: Record<Tone, string> = {
  muted: "text-muted",
  mutedLight: "text-muted-light",
  primary: "text-primary",
};

export function SectionEyebrow({
  children,
  tone = "muted",
}: {
  children: string;
  tone?: Tone;
}) {
  const base = "mb-5 text-[0.65rem] tracking-widest font-semibold uppercase";
  return <p className={`${base} ${toneClasses[tone]}`}>{children}</p>;
}
