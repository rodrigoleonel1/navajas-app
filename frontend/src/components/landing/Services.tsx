import { useEffect, useState } from "react";
import { services as fallbackServices, type Service } from "../../data/services";
import {
  listPopularServices,
  type Service as ApiService,
} from "../../lib/services";
import { formatPrice } from "../../lib/format";
import { Section } from "../ui/Section";
import { SectionEyebrow } from "../ui/SectionEyebrow";
import { SectionTitle } from "../ui/SectionTitle";
import { ServiceRow } from "./ServiceRow";

function toLandingServices(apiServices: ApiService[]): Service[] {
  return apiServices.map((service, index) => ({
    index: String(index + 1).padStart(2, "0"),
    title: service.name,
    description: service.description || `${service.duration} min`,
    price: formatPrice(service.price),
  }));
}

export function Services() {
  // Los datos estáticos se muestran de entrada y quedan como fallback si la
  // API falla o no llega a tres servicios.
  const [items, setItems] = useState<Service[]>(fallbackServices);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const popular = await listPopularServices(3);
        if (!cancelled && popular.length >= 3) {
          setItems(toLandingServices(popular));
        }
      } catch {
        // Sin respuesta se mantienen los datos estáticos de la landing.
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Section
      id="servicios"
      className="grid grid-cols-1 md:grid-cols-[0.85fr_1.15fr] gap-6  bg-surface border-t border-white/6 py-16 md:py-24"
    >
      <div>
        <SectionEyebrow>Lo que hacemos</SectionEyebrow>
        <SectionTitle title="Cortes prolijos." highlight="Buena vibra." />
      </div>
      <div>
        {items.map((service, index) => (
          <ServiceRow
            key={service.index}
            index={service.index}
            title={service.title}
            description={service.description}
            price={service.price}
            isLast={index === items.length - 1}
          />
        ))}
      </div>
    </Section>
  );
}
