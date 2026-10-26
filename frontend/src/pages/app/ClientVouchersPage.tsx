import { Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { getErrorMessage } from "../../lib/api";
import { formatDateKey, toBusinessDayKey } from "../../lib/datetime";
import { cn } from "../../lib/utils";
import {
  getFidelityProgress,
  listVouchers,
  VOUCHER_SOURCE_LABELS,
  VOUCHER_STATUS_LABELS,
  VOUCHER_STATUS_TONES,
  type FidelityProgress,
  type Voucher,
} from "../../lib/vouchers";

function formatVoucherDate(iso: string): string {
  return formatDateKey(toBusinessDayKey(iso));
}

function VoucherCard({ voucher }: { voucher: Voucher }) {
  const active = voucher.status === "active";

  return (
    <li
      className={cn(
        "rounded-xl border border-border bg-background p-4",
        !active && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-barlow text-4xl font-bold leading-none">
            {voucher.discountPercent}%
          </p>
          <p className="mt-1 text-sm font-medium">
            {VOUCHER_SOURCE_LABELS[voucher.source] ?? voucher.source}
          </p>
        </div>
        <Badge tone={VOUCHER_STATUS_TONES[voucher.status] ?? "muted"}>
          {VOUCHER_STATUS_LABELS[voucher.status] ?? voucher.status}
        </Badge>
      </div>

      <div className="mt-3 border-t border-border pt-3 text-xs text-muted">
        {voucher.status === "used" && voucher.usedAt ? (
          <p>Usado el {formatVoucherDate(voucher.usedAt)}</p>
        ) : voucher.status === "expired" ? (
          <p>Venció el {formatVoucherDate(voucher.expiresAt)}</p>
        ) : (
          <p>Válido hasta el {formatVoucherDate(voucher.expiresAt)}</p>
        )}
        {active && (
          <p className="mt-1">
            Se aplicará automáticamente en tu próxima reserva.
          </p>
        )}
      </div>
    </li>
  );
}

export function ClientVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [progress, setProgress] = useState<FidelityProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([listVouchers(), getFidelityProgress()])
      .then(([data, fidelity]) => {
        if (cancelled) return;
        setVouchers(data);
        setProgress(fidelity);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(getErrorMessage(err, "Error al cargar los vales"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = vouchers.filter((voucher) => voucher.status === "active");
  const history = vouchers.filter((voucher) => voucher.status !== "active");

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Cliente"
        title="Mis"
        highlight="vales."
        description="Descuentos disponibles para tus próximas visitas."
      />

      {loading ? (
        <Loader label="Cargando vales..." height="page" />
      ) : error ? (
        <p className="mt-6 text-sm text-destructive">{error}</p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {progress && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
                  Fidelidad
                </h3>
                <span className="font-jetbrains text-xs text-muted">
                  {progress.inCycle}/{progress.target} turnos
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                Cada {progress.target} turnos completados ganás un vale del{" "}
                {progress.discountPercent}%. Te faltan {progress.remaining}{" "}
                turno{progress.remaining === 1 ? "" : "s"} para el próximo.
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full border border-border bg-background">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${(progress.inCycle / progress.target) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
                Vigentes ({active.length})
              </h3>
              <Ticket
                size={20}
                className="text-primary"
                aria-hidden="true"
              />
            </div>

            {active.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                No tenés vales vigentes. Si el local cancela un turno, te
                emitiremos un vale automáticamente.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((voucher) => (
                  <VoucherCard key={voucher.id} voucher={voucher} />
                ))}
              </ul>
            )}

            <p className="mt-4 text-xs text-muted">
              Se aplica un solo vale por reserva y se usa primero el que vence
              antes.
            </p>
          </div>

          {history.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
                Historial ({history.length})
              </h3>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {history.map((voucher) => (
                  <VoucherCard key={voucher.id} voucher={voucher} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Section>
  );
}
