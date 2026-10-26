import { useState } from "react";
import { useToast } from "../hooks/useToast";
import { getErrorMessage } from "../lib/api";
import {
  createHoliday,
  updateHoliday,
  type CreateHolidayResult,
  type Holiday,
} from "../lib/holidays";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";

export function HolidayFormModal({
  holiday = null,
  onClose,
  onCreated,
  onUpdated,
}: {
  holiday?: Holiday | null;
  onClose: () => void;
  onCreated: (result: CreateHolidayResult) => void;
  onUpdated: (holiday: Holiday) => void;
}) {
  const toast = useToast();
  const [date, setDate] = useState(holiday?.date ?? "");
  const [name, setName] = useState(holiday?.name ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!date) {
      setError("Seleccioná una fecha");
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setError("El nombre debe tener entre 2 y 80 caracteres");
      return;
    }

    setError("");
    setSaving(true);
    try {
      if (holiday) {
        const updated = await updateHoliday(holiday.id, {
          date,
          name: trimmedName,
        });
        onUpdated(updated);
        toast.success("Feriado actualizado");
      } else {
        const result = await createHoliday({ date, name: trimmedName });
        onCreated(result);
        toast.success("Feriado agregado");
      }
      onClose();
    } catch (err) {
      toast.error(
        getErrorMessage(
          err,
          holiday ? "Error al actualizar feriado" : "Error al crear feriado",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={holiday ? "Editar feriado" : "Agregar feriado"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Input
          id="holiday-date"
          label="Fecha"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <Input
          id="holiday-name"
          label="Nombre"
          placeholder="Ej: Navidad"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="text-xs text-muted">
          Si ya hay turnos ese día, no se cancelan automáticamente.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button variant="primaryBlock" disabled={saving}>
          {saving
            ? "Guardando..."
            : holiday
              ? "Guardar cambios"
              : "Agregar feriado"}
        </Button>
      </form>
    </Modal>
  );
}
