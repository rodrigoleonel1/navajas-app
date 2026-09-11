import { Section } from "../ui/Section";
import { SectionHeader } from "../ui/SectionHeader";
import { ServiceRow } from "./ServiceRow";
import { services } from "../../data/services";

export function Services() {
  return (
    <Section
      id="servicios"
      className="grid grid-cols-1 md:grid-cols-[0.85fr_1.15fr] gap-6  bg-surface border-t border-white/6 py-16 md:py-24"
    >
      <SectionHeader
        eyebrow="Lo que hacemos"
        title="Cortes prolijos."
        highlight="Buena vibra."
      />
      <div>
        {services.map((s, i) => (
          <ServiceRow
            key={s.index}
            index={s.index}
            title={s.title}
            description={s.description}
            price={s.price}
            isLast={i === services.length - 1}
          />
        ))}
      </div>
    </Section>
  );
}
