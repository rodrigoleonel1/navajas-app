import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

type MobileNavLinkProps = {
  to: string;
  label: string;
  index: string;
  isFirst?: boolean;
  onClick?: () => void;
};

export function MobileNavLink({ to, label, index, isFirst, onClick }: MobileNavLinkProps) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className={`group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 py-4 font-barlow text-3xl font-extrabold tracking-wide uppercase border-b hover:pl-2 transition-all duration-200 ${isFirst ? "border-t border-border" : "border-border-subtle"}`}
    >
      <span className="font-jetbrains text-[0.65rem] font-medium text-primary">{index}</span>
      <span>{label}</span>
      <ArrowUpRight
        size={16}
        className="text-primary opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200"
        aria-hidden="true"
      />
    </Link>
  );
}
