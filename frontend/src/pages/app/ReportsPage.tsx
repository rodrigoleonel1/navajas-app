import { useEffect, useMemo, useState } from "react";
import { DateField } from "../../components/ui/DateField";
import { ListCard } from "../../components/ui/ListCard";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StarRating } from "../../components/StarRating";
import { getErrorMessage } from "../../lib/api";
import {
  formatDateKey,
  shiftDayKey,
  toBusinessDayKey,
} from "../../lib/datetime";
import { formatPrice } from "../../lib/format";
import {
  getBusinessReport,
  type BusinessReport,
  type ReportPopularRow,
} from "../../lib/reports";

function defaultRange() {
  const today = toBusinessDayKey(new Date().toISOString());
  return { from: shiftDayKey(today, -29), to: today };
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

function PopularList({
  title,
  rows,
}: {
  title: string;
  rows: ReportPopularRow[];
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <h4 className="font-barlow text-xs font-bold uppercase tracking-widest text-muted">
        {title}
      </h4>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Sin datos en el período.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-2">
          {rows.map((row, index) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="font-jetbrains text-xs text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="truncate">{row.label}</span>
              </span>
              <span className="font-jetbrains text-xs text-primary">
                {row.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function ReportsPage() {
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState<BusinessReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const rangeValid = useMemo(() => range.from <= range.to, [range]);
  // El rango inválido se resuelve en el render, sin setState dentro del effect.
  const rangeError = rangeValid
    ? ""
    : "El rango de fechas es inválido: desde no puede ser posterior a hasta.";
  const visibleError = rangeError || error;

  useEffect(() => {
    if (!rangeValid) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const report = await getBusinessReport(range);
        if (!cancelled) setData(report);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(getErrorMessage(err, "Error al cargar los reportes"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [range, rangeValid]);

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Reportes"
        highlight="del negocio."
        description="Ingresos, ausencias de clientes por barbero, calificación promedio y lo más solicitado en el período."
      />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <DateField
            id="reports-from"
            label="Desde"
            value={range.from}
            onChange={(from) => setRange((current) => ({ ...current, from }))}
          />
          <DateField
            id="reports-to"
            label="Hasta"
            value={range.to}
            onChange={(to) => setRange((current) => ({ ...current, to }))}
          />
        </div>
        <p className="font-jetbrains text-xs uppercase tracking-widest text-muted">
          {formatDateKey(range.from)} — {formatDateKey(range.to)}
        </p>
      </div>

      {visibleError && (
        <p className="mt-6 text-sm text-destructive">{visibleError}</p>
      )}

      {!rangeValid ? null : loading ? (
        <Loader label="Cargando reportes..." height="card" />
      ) : data ? (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="Facturado"
              value={formatPrice(data.income.totals.gross)}
              hint="Precio total de los turnos completados"
            />
            <SummaryCard
              label="Comisión barberos"
              value={formatPrice(data.income.totals.commission)}
              hint="60% de los turnos"
            />
            <SummaryCard
              label="Turnos completados"
              value={String(data.income.totals.completed)}
              hint="Base de la comisión"
            />
            <SummaryCard
              label="Ausencias de clientes"
              value={String(data.absences.totals.total)}
              hint="Inasistencias + cancelaciones tardías"
            />
            <SummaryCard
              label="Calificación promedio"
              value={
                data.ratings.average == null
                  ? "—"
                  : `${data.ratings.average.toFixed(1)} / 5`
              }
              hint={
                data.ratings.count === 0
                  ? "Sin calificaciones en el período"
                  : `${data.ratings.count} calificación${data.ratings.count === 1 ? "" : "es"}`
              }
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-barlow text-sm font-bold uppercase tracking-widest">
                Ausencias por barbero
              </h3>
              <p className="text-xs text-muted">
                Turnos perdidos por inasistencia o cancelación tardía del
                cliente
              </p>
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-border bg-background lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted">
                    <th className="px-4 py-3 font-semibold">Barbero</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Inasistencias
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Cancel. tardías
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.absences.barbers.map((barber) => (
                    <tr
                      key={barber.barberId}
                      className="border-b border-border transition-colors last:border-0 hover:bg-primary/5"
                    >
                      <td className="px-4 py-3 font-medium">
                        {barber.barberName}
                      </td>
                      <td className="px-4 py-3 text-right text-muted">
                        {barber.noShow}
                      </td>
                      <td className="px-4 py-3 text-right text-muted">
                        {barber.lateCancellations}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-primary">
                        {barber.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="grid items-start gap-3 sm:grid-cols-2 lg:hidden">
              {data.absences.barbers.map((barber) => (
                <ListCard
                  key={barber.barberId}
                  title={barber.barberName}
                  subtitle={`${barber.total} ausencia${barber.total === 1 ? "" : "s"}`}
                  detail={`Inasistencias ${barber.noShow} · Cancel. tardías ${barber.lateCancellations}`}
                  footerLeft={String(barber.total)}
                  footerRight={
                    <span className="text-[10px] uppercase tracking-widest text-primary">
                      Total
                    </span>
                  }
                />
              ))}
            </ul>

            {data.absences.totals.total === 0 && (
              <p className="mt-4 text-sm text-muted">
                No hay ausencias registradas en el período.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-barlow text-sm font-bold uppercase tracking-widest">
                Calificaciones por barbero
              </h3>
              <p className="text-xs text-muted">
                Promedio de notas de turnos completados
              </p>
            </div>

            <div className="hidden overflow-hidden rounded-xl border border-border bg-background lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-widest text-muted">
                    <th className="px-4 py-3 font-semibold">Barbero</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Promedio
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Calificaciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.ratings.barbers.map((barber) => (
                    <tr
                      key={barber.barberId}
                      className="border-b border-border transition-colors last:border-0 hover:bg-primary/5"
                    >
                      <td className="px-4 py-3 font-medium">
                        {barber.barberName}
                      </td>
                      <td className="px-4 py-3">
                        {barber.average == null ? (
                          <p className="text-right text-muted">—</p>
                        ) : (
                          <span className="flex items-center justify-end gap-2">
                            <StarRating
                              value={barber.average}
                              fractional
                              size={14}
                            />
                            <span className="font-medium text-primary">
                              {barber.average.toFixed(1)}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted">
                        {barber.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="grid items-start gap-3 sm:grid-cols-2 lg:hidden">
              {data.ratings.barbers.map((barber) => (
                <ListCard
                  key={barber.barberId}
                  title={barber.barberName}
                  subtitle={
                    barber.count === 0
                      ? "Sin calificaciones"
                      : `${barber.count} calificación${barber.count === 1 ? "" : "es"}`
                  }
                  detail={
                    barber.average == null ? undefined : (
                      <StarRating
                        value={barber.average}
                        fractional
                        size={14}
                      />
                    )
                  }
                  footerLeft={
                    barber.average == null
                      ? "—"
                      : `${barber.average.toFixed(1)} / 5`
                  }
                  footerRight={
                    <span className="text-[10px] uppercase tracking-widest text-primary">
                      Promedio
                    </span>
                  }
                />
              ))}
            </ul>

            {data.ratings.count === 0 && (
              <p className="mt-4 text-sm text-muted">
                No hay calificaciones en el período.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-barlow text-sm font-bold uppercase tracking-widest">
                Lo más solicitado
              </h3>
              <p className="text-xs text-muted">
                Top 5 por turnos reservados (sin cancelados)
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <PopularList
                title="Servicios"
                rows={data.popular.services}
              />
              <PopularList title="Combos" rows={data.popular.offers} />
              <PopularList title="Barberos" rows={data.popular.barbers} />
              <PopularList title="Horarios" rows={data.popular.hours} />
            </div>
          </div>
        </div>
      ) : null}
    </Section>
  );
}
