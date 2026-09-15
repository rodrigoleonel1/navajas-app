import { cn } from "../../lib/utils";
import { SectionEyebrow } from "./SectionEyebrow";
import { SectionTitle } from "./SectionTitle";

type EyebrowTone = "muted" | "primary";

const descriptionClass =
  "font-jetbrains text-xs uppercase text-muted-2 md:max-w-xs md:text-right mt-4 md:mt-0";

type SectionHeaderProps = {
  eyebrow: string;
  eyebrowTone?: EyebrowTone;
  title: string;
  highlight: string;
  description?: string;
  layout?: "stacked" | "split" | "fragment";
  compact?: boolean;
  className?: string;
};

export function SectionHeader({
  eyebrow,
  eyebrowTone,
  title,
  highlight,
  description,
  layout = "stacked",
  compact,
  className,
}: SectionHeaderProps) {
  const titleBlock = (
    <div>
      <SectionEyebrow tone={eyebrowTone}>{eyebrow}</SectionEyebrow>
      <SectionTitle title={title} highlight={highlight} compact={compact} />
    </div>
  );

  if (layout === "split" && description) {
    return (
      <div
        className={cn(
          "flex flex-col md:flex-row justify-between md:items-end",
          className,
        )}
      >
        {titleBlock}
        <p className={descriptionClass}>{description}</p>
      </div>
    );
  }

  if (layout === "fragment") {
    return (
      <>
        <SectionEyebrow tone={eyebrowTone}>{eyebrow}</SectionEyebrow>
        <SectionTitle title={title} highlight={highlight} compact={compact} />
        {description ? <p className={descriptionClass}>{description}</p> : null}
      </>
    );
  }

  return (
    <div className={cn(className)}>
      {titleBlock}
      {description ? <p className={descriptionClass}>{description}</p> : null}
    </div>
  );
}
