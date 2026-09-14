import { ArrowUpRight } from "lucide-react";
import { Button } from "../ui/Button";
import { SectionHeader } from "../ui/SectionHeader";

export function Manifesto() {
  return (
    <section
      id="nosotros"
      className="noise-overlay relative border-y border-border-light grid grid-cols-1 md:grid-cols-3 gap-8 px-5 py-16 md:py-24 md:px-shell"
    >
      <SectionHeader
        eyebrow="Nuestra esencia"
        eyebrowTone="primary"
        title="Más que un"
        highlight="corte."
        layout="fragment"
      />

      <div className="max-w-88">
        <p className="mb-6 text-muted-light">
          El punto de encuentro del barrio. Donde te conocen por tu nombre, tu
          corte y tu charla. Música y tijera sin apuro.
        </p>
        <Button variant="link" href="/login">
          Vení a conocernos <ArrowUpRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
