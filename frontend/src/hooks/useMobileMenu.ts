import { useCallback, useState } from "react";
import { useLockBodyScroll } from "./useLockBodyScroll";

export function useMobileMenu() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((isOpen) => !isOpen), []);
  useLockBodyScroll(open);
  return { open, close, toggle, setOpen };
}
