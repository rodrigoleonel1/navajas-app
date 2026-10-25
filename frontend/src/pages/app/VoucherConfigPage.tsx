import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../lib/api";
import {
  formatDateKey,
  shiftDayKey,
  toBusinessDayKey,
} from "../../lib/datetime";
import {
  getVoucherConfig,
  updateVoucherConfig,
} from "../../lib/vouchers";

export function VoucherConfigPage() {
  const toast = useToast();
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getVoucherConfig()
      .then((config) => {
        if (!cancelled) setDays(String(config.adminCancellationDays));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            getErrorMessage(err, "Error al cargar la configuración de vales"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const parsedDays = Number(days);
  const validDays =
    Number.isInteger(parsedDays) && parsedDays >= 1 && parsedDays <= 365;
  const preview = validDays
    ? formatDateKey(
        shiftDayKey(toBusinessDayKey(new Date().toISOString()), parsedDays),
      )
    : null;

  async function handleSave() {
    if (!validDays) {
      toast.error("La duración debe ser un entero entre 1 y 365 días");
      return;
    }

    setSaving(true);
    try {
      const config = await updateVoucherConfig({
        adminCancellationDays: parsedDays,
      });
      setDays(String(config.adminCancellationDays));
      toast.success("Configuración de vales guardada");
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al guardar la configuración"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Configuración"
        highlight="de vales."
        description="Duración del vale que se emite cuando el local cancela un turno."
      />

      {loading ? (
        <Loader label="Cargando configuración..." height="page" />
      ) : error ? (
        <p className="mt-6 text-sm text-destructive">{error}</p>
      ) : (
        <div className="mt-8 max-w-xl bg-card border border-border rounded-2xl p-6">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
            Vale por cancelación del local
          </h3>
          <p className="mt-2 text-sm text-muted">
            El vale otorga 20% de descuento y se aplica automáticamente en la
            próxima reserva del cliente. Acá solo se configura su duración.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <Input
              id="admin-cancellation-days"
              label="Días de vigencia"
              type="number"
              min={1}
              max={365}
              step={1}
              value={days}
              onChange={(event) => setDays(event.target.value)}
            />
            {preview && (
              <p className="text-xs text-muted">
                Un vale emitido hoy vencería el {preview}.
              </p>
            )}
            <Button
              variant="primaryBlock"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Guardando..." : "Guardar configuración"}
            </Button>
          </div>
        </div>
      )}
    </Section>
  );
}
