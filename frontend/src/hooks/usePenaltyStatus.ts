import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "../lib/api";
import { getPenaltyStatus, type PenaltyStatus } from "../lib/penalties";

// Estado de penalizaciones del cliente (RN5). Si el endpoint falla, la reserva
// sigue funcionando: el aviso es informativo.
export function usePenaltyStatus(enabled = true) {
  const [status, setStatus] = useState<PenaltyStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await getPenaltyStatus();
      setStatus(data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "No se pudieron cargar las penalizaciones"));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    getPenaltyStatus()
      .then((data) => {
        if (!cancelled) {
          setStatus(data);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            getErrorMessage(err, "No se pudieron cargar las penalizaciones"),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { status, loading, error, refresh };
}
