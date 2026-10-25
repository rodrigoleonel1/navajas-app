import { useEffect, useMemo, useState } from "react";
import { BarberEarningsChart } from "../../components/BarberEarningsChart";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { getErrorMessage } from "../../lib/api";
import {
  formatDateKey,
  shiftDayKey,
  toBusinessDayKey,
} from "../../lib/datetime";
import { getMyEarnings, type BarberEarnings } from "../../lib/earnings";
import { formatPrice } from "../../lib/format";

type Period = "week" | "month";

function getRange(period: Period) {
  const today = toBusinessDayKey(new Date().toISOString());
  if (period === "month") {
    return { from: `${today.slice(0, 7)}-01`, to: today };
  }

  const weekday = new Date(`${today}T12:00:00.000Z`).getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;
  return { from: shiftDayKey(today, -daysSinceMonday), to: today };
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="font-jetbrains text-[11px] uppercase tracking-widest text-muted">
        {label}
      </p>
      <p className="mt-2 font-barlow text-3xl font-bold leading-none">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function BarberIngresosPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [data, setData] = useState<BarberEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = useMemo(() => getRange(period), [period]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const earnings = await getMyEarnings(range);
        if (!cancelled) setData(earnings);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(getErrorMessage(err, "Error al cargar tus ingresos"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Barbero"
        title="Ingresos"
        highlight="60%."
        description="Comisión sobre el precio total de tus turnos completados."
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {(["week", "month"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => setPeriod(value)}
              className={
                period === value
                  ? "rounded-full bg-primary px-4 py-2 text-xs font-semibold text-background"
                  : "rounded-full px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
              }
            >
              {value === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
        <p className="font-jetbrains text-xs uppercase tracking-widest text-muted">
          {formatDateKey(range.from)} — {formatDateKey(range.to)}
        </p>
      </div>

      {error && (
        <p className="mt-6 text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <Loader label="Cargando ingresos..." height="card" />
      ) : data ? (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard
              label="Comisión 60%"
              value={formatPrice(data.totals.commission)}
              hint="Sobre el precio total"
            />
            <SummaryCard
              label="Facturado"
              value={formatPrice(data.totals.gross)}
              hint="Precio total de los turnos"
            />
            <SummaryCard
              label="Turnos completados"
              value={String(data.totals.completed)}
              hint="Base de la comisión"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-barlow text-sm font-bold uppercase tracking-widest">
                Comisión por día
              </h3>
              <p className="text-xs text-muted">
                {period === "week" ? "Semana actual" : "Mes actual"}
              </p>
            </div>
            <BarberEarningsChart days={data.days} period={period} />
            {data.totals.completed === 0 && (
              <p className="mt-2 text-center text-sm text-muted">
                No hay turnos completados en este período.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </Section>
  );
}
