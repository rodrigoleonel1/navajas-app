import { ArrowUpRight } from "lucide-react";
import { cn } from "../../lib/utils";

type ServiceRowProps = {
  index: string;
  title: string;
  description: string;
  price: string;
  isLast?: boolean;
};

export function ServiceRow({
  index,
  title,
  description,
  price,
  isLast,
}: ServiceRowProps) {
  return (
    <div
      className={cn(
        "group grid grid-cols-[2.6rem_1fr_auto_1.2rem] items-center gap-4 py-6 hover:pl-2 transition-all duration-200",
        !isLast && "border-b border-border-subtle",
      )}
    >
      <span className="text-primary font-jetbrains text-xs font-medium">
        {index}
      </span>
      <div>
        <h3 className="font-barlow text-xl font-extrabold   uppercase">
          {title}
        </h3>
        <p className="text-muted text-sm">{description}</p>
      </div>
      <strong className="font-jetbrains font-medium">{price}</strong>
      <ArrowUpRight
        size={14}
        className="text-primary opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200"
        aria-hidden="true"
      />
    </div>
  );
}
