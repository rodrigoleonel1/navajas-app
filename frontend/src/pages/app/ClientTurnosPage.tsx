import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";

export function ClientTurnosPage() {
  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Cliente"
        title="Mis"
        highlight="turnos."
        description="Consultá tus próximos turnos."
      />
    </Section>
  );
}
