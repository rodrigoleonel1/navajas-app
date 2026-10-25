import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDateKey, formatDayLabel } from "../lib/datetime";
import type { EarningsDay } from "../lib/earnings";
import { formatPrice } from "../lib/format";

type Period = "week" | "month";

type ChartDatum = EarningsDay & {
  tick: string;
  fullLabel: string;
};

function EarningsTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartDatum }[];
}) {
  if (!active || !payload?.length) return null;
  const day = payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="text-muted">{day.fullLabel}</p>
      <p className="mt-1 font-jetbrains text-sm text-foreground">
        {formatPrice(day.commission)}
      </p>
      <p className="text-[11px] text-muted">
        {day.completed} turno{day.completed === 1 ? "" : "s"} completado
        {day.completed === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function BarberEarningsChart({
  days,
  period,
}: {
  days: EarningsDay[];
  period: Period;
}) {
  const data: ChartDatum[] = days.map((day) => ({
    ...day,
    tick:
      period === "week"
        ? formatDayLabel(day.date).split(" ")[0]
        : day.date.slice(-2),
    fullLabel: formatDateKey(day.date),
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="tick"
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={78}
            tick={{ fill: "var(--color-muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatPrice(Number(value))}
          />
          <Tooltip
            cursor={{ fill: "rgba(96, 165, 250, 0.08)" }}
            content={<EarningsTooltip />}
          />
          <Bar
            dataKey="commission"
            fill="var(--color-primary)"
            radius={[4, 4, 0, 0]}
            maxBarSize={44}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
