import { ArrowUpRight } from "lucide-react";
import { Button } from "../ui/Button";
import { SectionHeader } from "../ui/SectionHeader";

export function Booking() {
  return (
    <section
      id="reserva"
      className="noise-overlay relative border-y border-border-light grid grid-cols-1 md:grid-cols-3 gap-8 px-5 py-16 md:py-24 md:px-shell"
    >
      <SectionHeader
        eyebrow="¿Listo?"
        eyebrowTone="primary"
        title="Nos vemos"
        highlight="en la silla."
        layout="fragment"
      />

      <div className="max-w-88">
        <p className="mb-6 text-muted-light">
          Reserva online en menos de un minuto. O pásate por el local, siempre
          hay sitio para uno más.
        </p>
        <Button href="./login.html">
          Reservar ahora <ArrowUpRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
