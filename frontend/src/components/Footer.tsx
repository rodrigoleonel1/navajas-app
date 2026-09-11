import { BrandLogo } from "./ui/BrandLogo";

export function Footer() {
  return (
    <footer className="grid grid-cols-2 md:grid-cols-4 gap-8 px-5 py-16 md:px-shell bg-surface border-t border-white/6">
      <BrandLogo className="col-span-2 md:col-span-1" />
      <p className="t text-[0.65rem] tracking-wide uppercase text-muted">
        Av. Rivadavia 17642, Morón
        <br />
        B1708 Buenos Aires
      </p>
      <p className="text-[0.65rem] tracking-wide uppercase text-muted">
        Instagram <strong className="text-primary">@navajasbarber</strong>
        <br />
        hola@navajasbarber
      </p>
      <span className="font-jetbrains text-xs col-span-2 md:col-span-1 text-muted">
        © 2026 NB
      </span>
    </footer>
  );
}
