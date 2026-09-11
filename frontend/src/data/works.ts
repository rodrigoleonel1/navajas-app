export type Work = {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  index: string;
};

export const works: Work[] = [
  {
    src: "/images/work-low-fade-800.jpg",
    alt: "Low Fade, degradado limpio en Navajas Barber",
    title: "Low Fade",
    subtitle: "Degradado limpio",
    index: "01",
  },
  {
    src: "/images/work-crop-800.jpg",
    alt: "Crop texturizado urbano en Navajas Barber",
    title: "Crop",
    subtitle: "Textura urbana",
    index: "02",
  },
  {
    src: "/images/work-barba-800.jpg",
    alt: "Barba con perfilado y toalla en Navajas Barber",
    title: "Barba",
    subtitle: "Perfilado + toalla",
    index: "03",
  },
];
