import { useEffect, useState } from "react";
import { DateField } from "../../components/ui/DateField";
import { ListCard } from "../../components/ui/ListCard";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { getErrorMessage } from "../../lib/api";
import { formatDateKey, toBusinessDayKey } from "../../lib/datetime";
import { getDailyEarnings, type DailyEarnings } from "../../lib/earnings";
import { formatPrice } from "../../lib/format";

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

export function AdminDailyEarningsPage() {
  const [date, setDate] = useState(() =>
    toBusinessDayKey(new Date().toISOString()),
  );
  const [data, setData] = useState<DailyEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const earnings = await getDailyEarnings(date);
        if (!cancelled) setData(earnings);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(getErrorMessage(err, "Error al cargar la liquidación"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Liquidaciones"
        highlight="diarias."
        description="Comisión de barberos y parte del local por turnos completados."
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <DateField
          id="daily-earnings-date"
          label="Fecha"
          value={date}
          onChange={setDate}
        />
        <p className="font-jetbrains text-xs uppercase tracking-widest text-muted">
          {formatDateKey(date)}
        </p>
      </div>

      {error && (
        <p className="mt-6 text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <Loader label="Cargando liquidación..." height="card" />
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
                No hay barberos para liquidar.
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
                    No hay turnos completados para esta fecha.
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
