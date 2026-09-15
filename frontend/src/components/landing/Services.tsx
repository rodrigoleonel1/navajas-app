import { services } from "../../data/services";
import { Section } from "../ui/Section";
import { SectionHeader } from "../ui/SectionHeader";
import { ServiceRow } from "./ServiceRow";

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
        {services.map((service, index) => (
          <ServiceRow
            key={service.index}
            index={service.index}
            title={service.title}
            description={service.description}
            price={service.price}
            isLast={index === services.length - 1}
          />
        ))}
      </div>
    </Section>
  );
}
