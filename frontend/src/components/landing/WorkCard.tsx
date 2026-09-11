type WorkCardProps = {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  index: string;
};

export function WorkCard({ src, alt, title, subtitle, index }: WorkCardProps) {
  return (
    <article className="group">
      <div className="h-88 md:h-104 overflow-hidden rounded-xl border border-border-light">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover block group-hover:scale-105  group-hover:contrast-120 transition-all duration-600"
        />
      </div>
      <div className="flex justify-between pt-2">
        <div>
          <h3 className="font-barlow text-xl font-extrabold  uppercase">
            {title}
          </h3>
          <p className="text-muted text-xs font-medium uppercase">{subtitle}</p>
        </div>
        <span className="font-jetbrains text-sm text-primary">
          {index}
        </span>
      </div>
    </article>
  );
}
