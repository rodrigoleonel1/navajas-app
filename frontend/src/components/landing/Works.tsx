import { Section } from "../ui/Section";
import { SectionHeader } from "../ui/SectionHeader";
import { WorkCard } from "./WorkCard";
import { works } from "../../data/works";

export function Works() {
  return (
    <Section id="trabajos" className="bg-surface py-16 md:py-24">
      <SectionHeader
        eyebrow="Nuestros cortes"
        title="Trabajos"
        highlight="que hablan."
        description="Degradados limpios, textura y tijera. Detalle a detalle."
        descriptionVariant="monoMuted"
        layout="split"
        className="mb-8"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {works.map((work) => (
          <WorkCard key={work.index} {...work} />
        ))}
      </div>
    </Section>
  );
}
