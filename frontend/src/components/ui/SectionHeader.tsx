import { cn } from "../../lib/utils";
import { SectionEyebrow } from "./SectionEyebrow";
import { SectionTitle } from "./SectionTitle";
import type { ComponentProps } from "react";

type EyebrowTone = NonNullable<ComponentProps<typeof SectionEyebrow>["tone"]>;
type TitleAs = NonNullable<ComponentProps<typeof SectionTitle>["as"]>;
type TitleSize = NonNullable<ComponentProps<typeof SectionTitle>["size"]>;
type HighlightVariant = NonNullable<
  ComponentProps<typeof SectionTitle>["highlightVariant"]
>;

type DescriptionVariant = "mutedLight" | "monoMuted";

const descriptionVariantClasses: Record<DescriptionVariant, string> = {
  mutedLight: "mb-6 text-muted-light",
  monoMuted:
    "font-jetbrains text-xs uppercase text-muted-2 md:max-w-xs md:text-right mt-4 md:mt-0",
};

type SectionHeaderProps = {
  eyebrow: string;
  eyebrowTone?: EyebrowTone;
  title: string;
  highlight: string;
  as?: TitleAs;
  size?: TitleSize;
  highlightVariant?: HighlightVariant;
  description?: string;
  descriptionVariant?: DescriptionVariant;
  descriptionClassName?: string;
  layout?: "stacked" | "split" | "fragment";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  eyebrowTone,
  title,
  highlight,
  as,
  size,
  highlightVariant,
  description,
  descriptionVariant,
  descriptionClassName,
  layout = "stacked",
  className,
}: SectionHeaderProps) {
  const descriptionClasses = description
    ? cn(
        descriptionVariant ? descriptionVariantClasses[descriptionVariant] : "",
        descriptionClassName,
      )
    : "";

  const titleBlock = (
    <div>
      <SectionEyebrow tone={eyebrowTone}>{eyebrow}</SectionEyebrow>
      <SectionTitle
        title={title}
        highlight={highlight}
        as={as}
        size={size}
        highlightVariant={highlightVariant}
      />
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
        <p className={descriptionClasses}>{description}</p>
      </div>
    );
  }

  if (layout === "fragment") {
    return (
      <>
        <SectionEyebrow tone={eyebrowTone}>{eyebrow}</SectionEyebrow>
        <SectionTitle
          title={title}
          highlight={highlight}
          as={as}
          size={size}
          highlightVariant={highlightVariant}
        />
        {description ? (
          <p className={descriptionClasses}>{description}</p>
        ) : null}
      </>
    );
  }

  return (
    <div className={cn(className)}>
      {titleBlock}
      {description ? <p className={descriptionClasses}>{description}</p> : null}
    </div>
  );
}
