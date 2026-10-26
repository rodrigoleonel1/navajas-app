import { useState } from "react";
import { useToast } from "../hooks/useToast";
import { getErrorMessage } from "../lib/api";
import type { Appointment } from "../lib/appointments";
import { formatWeekdayDateTime } from "../lib/datetime";
import { createRating, type RatingResult } from "../lib/ratings";
import { StarRating } from "./StarRating";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

// EP-7 / CA-21: calificación única de un turno completado.
export function RatingModal({
  appointment,
  onClose,
  onRated,
}: {
  appointment: Appointment;
  onClose: () => void;
  onRated: (result: RatingResult) => void;
}) {
  const toast = useToast();
  const [score, setScore] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (score == null) return;
    setSaving(true);
    try {
      const result = await createRating({
        appointmentId: appointment.id,
        score,
      });
      toast.success("¡Gracias por calificar!");
      onRated(result);
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al calificar el turno"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Calificar turno" onClose={onClose}>
      <div className="text-center">
        <p className="text-sm font-semibold">
          {appointment.barber.name
            ? `Barbero: ${appointment.barber.name}`
            : "Tu barbero"}
        </p>
        <p className="text-xs text-muted">
          {formatWeekdayDateTime(appointment.startAt)}
        </p>
        <p className="mt-5 text-sm">¿Cómo fue tu experiencia?</p>
        <div className="mt-3 flex justify-center">
          <StarRating value={score} onChange={setScore} size={34} />
        </div>
        <p className="mt-2 text-xs text-muted">
          {score == null ? "Elegí de 1 a 5 estrellas" : `${score} de 5`}
        </p>
      </div>
      <Button
        variant="primaryBlock"
        className="mt-6 w-full"
        disabled={score == null || saving}
        onClick={handleSubmit}
      >
        {saving ? "Enviando..." : "Enviar calificación"}
      </Button>
      <p className="mt-3 text-center text-[11px] text-muted">
        La calificación no se puede modificar.
      </p>
    </Modal>
  );
}
