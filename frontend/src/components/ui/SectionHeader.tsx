import { cn } from "../../lib/utils";
import { SectionEyebrow } from "./SectionEyebrow";
import { SectionTitle } from "./SectionTitle";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  highlight,
  description,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row justify-between md:items-end mb-8",
        className,
      )}
    >
      <div>
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
        <SectionTitle title={title} highlight={highlight} />
      </div>
      <p className="font-jetbrains text-xs uppercase text-muted-2 md:max-w-xs md:text-right mt-4 md:mt-0">
        {description}
      </p>
    </div>
  );
}
