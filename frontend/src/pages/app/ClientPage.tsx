import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";

export function ClientPage() {
  return (
    <Section>
      <SectionHeader
        compact
        eyebrow="Panel — Cliente"
        title="Reservar"
        highlight="turno."
        description="Bienvenido, elegí servicio y barbero."
        layout="split"
      />
    </Section>
  );
}
