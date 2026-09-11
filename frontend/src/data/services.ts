export type Service = {
  index: string;
  title: string;
  description: string;
  price: string;
};

export const services: Service[] = [
  {
    index: "01",
    title: "Corte clásico",
    description: "Fade, taper o tijera",
    price: "$15.000",
  },
  {
    index: "02",
    title: "Corte + barba",
    description: "Ritual completo",
    price: "$23.000",
  },
  {
    index: "03",
    title: "Barba premium",
    description: "Perfilado y toalla caliente",
    price: "$8.000",
  },
];
