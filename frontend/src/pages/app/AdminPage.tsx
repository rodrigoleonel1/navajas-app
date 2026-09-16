import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";

export function AdminPage() {
  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Gestión"
        highlight="general."
        description="Administrá barberos y agenda."
      />
    </Section>
  );
}
