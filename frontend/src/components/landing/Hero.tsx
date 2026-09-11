import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Button } from "../ui/Button";
import { SectionEyebrow } from "../ui/SectionEyebrow";
import { SectionTitle } from "../ui/SectionTitle";

export function Hero() {
  return (
    <section
      id="top"
      className="hero-section relative grid grid-cols-1 bg-[url('/images/hero.jpg')] bg-center bg-cover px-5 py-28 md:px-shell md:py-36 *:z-1"
    >
      <div>
        <SectionEyebrow tone="mutedLight">
          Est. 2016 / Morón, Buenos Aires
        </SectionEyebrow>
        <SectionTitle
          as="h1"
          size="hero"
          title="Tu estilo."
          highlight="Tu código."
          highlightVariant="primary"
        />
        <p className="max-w-md my-6 text-muted-light">
          Fade prolijo, tijera y charla de barrio. Desde 2016 sobre Rivadavia, a
          una cuadra de la estación.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <Button href="./login.html">
            Pide tu cita <ArrowUpRight size={14} caria-hidden="true" />
          </Button>
          <Button variant="secondary" href="#servicios">
            Ver servicios <ArrowDown size={14} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
