import { useEffect, useMemo, useState } from "react";
import { EarningsChart } from "../../components/EarningsChart";
import { DateField } from "../../components/ui/DateField";
import { ListCard } from "../../components/ui/ListCard";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { getErrorMessage } from "../../lib/api";
import {
  formatDateKey,
  getWeekRange,
  shiftDayKey,
  toBusinessDayKey,
} from "../../lib/datetime";
import { getAdminEarnings, type AdminEarnings } from "../../lib/earnings";
import { formatPrice } from "../../lib/format";

type Period = "day" | "week" | "month";

function lastDayOfMonth(dayKey: string) {
  const nextMonthStart = `${shiftDayKey(`${dayKey.slice(0, 7)}-01`, 32).slice(0, 7)}-01`;
  return shiftDayKey(nextMonthStart, -1);
}

// La fecha elegida es la referencia: Día = ese día, Semana = lunes a domingo,
// Mes = mes completo. Si el período es el actual, el fin se recorta a hoy.
function getRange(period: Period, anchor: string) {
  const today = toBusinessDayKey(new Date().toISOString());
  if (period === "day") {
    return { from: anchor, to: anchor };
  }

  if (period === "week") {
    return getWeekRange(anchor, today);
  }

  const from = `${anchor.slice(0, 7)}-01`;
  const end = lastDayOfMonth(anchor);
  return { from, to: end > today && from <= today ? today : end };
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

export function AdminEarningsPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [anchor, setAnchor] = useState(() =>
    toBusinessDayKey(new Date().toISOString()),
  );
  const [data, setData] = useState<AdminEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const range = useMemo(() => getRange(period, anchor), [period, anchor]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const earnings = await getAdminEarnings(range);
        if (!cancelled) setData(earnings);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(getErrorMessage(err, "Error al cargar los ingresos"));
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
        eyebrow="Panel — Admin"
        title="Ingresos"
        highlight="del período."
        description="Comisión de barberos y parte del local por turnos completados."
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="inline-flex rounded-full border border-border bg-card p-1">
            {(["day", "week", "month"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={
                  period === value
                    ? "cursor-pointer rounded-full bg-primary px-4 py-2 text-xs font-semibold text-background"
                    : "cursor-pointer rounded-full px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground"
                }
              >
                {value === "day"
                  ? "Día"
                  : value === "week"
                    ? "Semana"
                    : "Mes"}
              </button>
            ))}
          </div>
          <DateField
            id="earnings-date"
            label={period === "day" ? "Fecha" : "Fecha de referencia"}
            value={anchor}
            onChange={setAnchor}
          />
        </div>
        <p className="font-jetbrains text-xs uppercase tracking-widest text-muted">
          {period === "day"
            ? formatDateKey(range.from)
            : `${formatDateKey(range.from)} — ${formatDateKey(range.to)}`}
        </p>
      </div>

      {error && (
        <p className="mt-6 text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <Loader label="Cargando ingresos..." height="card" />
      ) : data ? (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Comisión barberos"
              value={formatPrice(data.totals.commission)}
              hint="60% de los turnos"
            />
            <SummaryCard
              label="Parte local"
              value={formatPrice(data.totals.local)}
              hint="40% restante"
            />
            <SummaryCard
              label="Facturado"
              value={formatPrice(data.totals.gross)}
              hint="Precio total de los turnos"
            />
            <SummaryCard
              label="Turnos completados"
              value={String(data.totals.completed)}
              hint="Solo turnos en estado completed"
            />
          </div>

          {period !== "day" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-barlow text-sm font-bold uppercase tracking-widest">
                  Comisión por día
                </h3>
                <p className="text-xs text-muted">
                  60% de los turnos completados
                </p>
              </div>
              <EarningsChart days={data.days} period={period} />
              {data.totals.completed === 0 && (
                <p className="mt-2 text-center text-sm text-muted">
                  No hay turnos completados en este período.
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-barlow text-sm font-bold uppercase tracking-widest">
                Detalle por barbero
              </h3>
              <p className="text-xs text-muted">
                {data.barbers.length} barbero
                {data.barbers.length === 1 ? "" : "s"}
              </p>
            </div>

            {data.barbers.length === 0 ? (
              <p className="text-sm text-muted">
                No hay barberos para mostrar.
              </p>
            ) : (
              <>
                <div className="hidden overflow-hidden rounded-xl border border-border bg-background lg:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted">
                        <th className="px-4 py-3 font-semibold">Barbero</th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Turnos
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Facturado
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Comisión 60%
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          Local 40%
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.barbers.map((barber) => (
                        <tr
                          key={barber.barberId}
                          className="border-b border-border transition-colors last:border-0 hover:bg-primary/5"
                        >
                          <td className="px-4 py-3 font-medium">
                            {barber.barberName}
                          </td>
                          <td className="px-4 py-3 text-right text-muted">
                            {barber.completed}
                          </td>
                          <td className="px-4 py-3 text-right text-muted">
                            {formatPrice(barber.gross)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-primary">
                            {formatPrice(barber.commission)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted">
                            {formatPrice(barber.local)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border font-semibold">
                        <td className="px-4 py-3">Total</td>
                        <td className="px-4 py-3 text-right">
                          {data.totals.completed}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatPrice(data.totals.gross)}
                        </td>
                        <td className="px-4 py-3 text-right text-primary">
                          {formatPrice(data.totals.commission)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatPrice(data.totals.local)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <ul className="grid items-start gap-3 sm:grid-cols-2 lg:hidden">
                  {data.barbers.map((barber) => (
                    <ListCard
                      key={barber.barberId}
                      title={barber.barberName}
                      subtitle={`${barber.completed} turno${barber.completed === 1 ? "" : "s"} completado${barber.completed === 1 ? "" : "s"}`}
                      detail={`Facturado ${formatPrice(barber.gross)} · Local ${formatPrice(barber.local)}`}
                      footerLeft={formatPrice(barber.commission)}
                      footerRight={
                        <span className="text-[10px] uppercase tracking-widest text-primary">
                          Comisión 60%
                        </span>
                      }
                    />
                  ))}
                </ul>

                {data.totals.completed === 0 && (
                  <p className="mt-4 text-sm text-muted">
                    No hay turnos completados en este período.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      ) : null}
    </Section>
  );
}
