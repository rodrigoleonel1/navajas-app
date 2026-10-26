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

function isValidDays(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 365;
}

function expiryPreview(days: string) {
  if (!isValidDays(days)) return null;
  return formatDateKey(
    shiftDayKey(toBusinessDayKey(new Date().toISOString()), Number(days)),
  );
}

export function VoucherConfigPage() {
  const toast = useToast();
  const [adminDays, setAdminDays] = useState("30");
  const [fidelityDays, setFidelityDays] = useState("30");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getVoucherConfig()
      .then((config) => {
        if (cancelled) return;
        setAdminDays(String(config.adminCancellationDays));
        setFidelityDays(String(config.fidelityDays));
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

  const adminPreview = expiryPreview(adminDays);
  const fidelityPreview = expiryPreview(fidelityDays);

  async function handleSave() {
    if (!isValidDays(adminDays) || !isValidDays(fidelityDays)) {
      toast.error("Las duraciones deben ser enteros entre 1 y 365 días");
      return;
    }

    setSaving(true);
    try {
      const config = await updateVoucherConfig({
        adminCancellationDays: Number(adminDays),
        fidelityDays: Number(fidelityDays),
      });
      setAdminDays(String(config.adminCancellationDays));
      setFidelityDays(String(config.fidelityDays));
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
        description="Duración de los vales por cancelación del local y por fidelidad."
      />

      {loading ? (
        <Loader label="Cargando configuración..." height="page" />
      ) : error ? (
        <p className="mt-6 text-sm text-destructive">{error}</p>
      ) : (
        <div className="mt-8 grid max-w-4xl gap-4 lg:grid-cols-2">
          <div className="bg-card border border-border rounded-2xl p-6">
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
                value={adminDays}
                onChange={(event) => setAdminDays(event.target.value)}
              />
              {adminPreview && (
                <p className="text-xs text-muted">
                  Un vale emitido hoy vencería el {adminPreview}.
                </p>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
              Vale por fidelidad
            </h3>
            <p className="mt-2 text-sm text-muted">
              Cada 10 turnos completados el cliente recibe un vale del 30%. Acá
              solo se configura su duración.
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <Input
                id="fidelity-days"
                label="Días de vigencia"
                type="number"
                min={1}
                max={365}
                step={1}
                value={fidelityDays}
                onChange={(event) => setFidelityDays(event.target.value)}
              />
              {fidelityPreview && (
                <p className="text-xs text-muted">
                  Un vale emitido hoy vencería el {fidelityPreview}.
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
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
