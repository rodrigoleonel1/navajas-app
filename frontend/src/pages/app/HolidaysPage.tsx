import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { AppointmentMenu } from "../../components/AppointmentMenu";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ListCard } from "../../components/ui/ListCard";
import { Loader } from "../../components/ui/Loader";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { getErrorMessage } from "../../lib/api";
import { formatDateKey, toBusinessDayKey } from "../../lib/datetime";
import {
  createHoliday,
  deleteHoliday,
  listHolidays,
  updateHoliday,
  type Holiday,
} from "../../lib/holidays";

export function HolidaysPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [warning, setWarning] = useState("");
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setListError("");
      try {
        const data = await listHolidays();
        if (!cancelled) setHolidays(data);
      } catch (err) {
        if (!cancelled) {
          setHolidays([]);
          setListError(getErrorMessage(err, "Error al cargar feriados"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    if (!date) {
      toast.error("Seleccioná una fecha");
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.error("Nombre mínimo 2 caracteres");
      return;
    }

    setSaving(true);
    setWarning("");
    try {
      const result = await createHoliday({ date, name: trimmedName });
      setHolidays((prev) =>
        [...prev, result.holiday].sort((a, b) => a.date.localeCompare(b.date)),
      );
      setDate("");
      setName("");
      toast.success("Feriado agregado");
      if (result.affectedAppointments > 0) {
        setWarning(
          `Hay ${result.affectedAppointments} turno(s) pendiente(s) ese día. No se cancelaron automáticamente.`,
        );
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al crear feriado"));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(holiday: Holiday) {
    setEditing(holiday);
    setEditDate(holiday.date);
    setEditName(holiday.name);
    setWarning("");
  }

  async function handleSaveEdit() {
    if (!editing) return;
    if (!editDate) {
      toast.error("Seleccioná una fecha");
      return;
    }
    const trimmedName = editName.trim();
    if (trimmedName.length < 2) {
      toast.error("Nombre mínimo 2 caracteres");
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await updateHoliday(editing.id, {
        date: editDate,
        name: trimmedName,
      });
      setHolidays((prev) =>
        prev
          .map((item) => (item.id === updated.id ? updated : item))
          .sort((a, b) => a.date.localeCompare(b.date)),
      );
      setEditing(null);
      toast.success("Feriado actualizado");
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al actualizar feriado"));
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(holiday: Holiday) {
    const ok = await confirm({
      title: "Eliminar feriado",
      message: `¿Eliminar "${holiday.name}" del ${formatDateKey(holiday.date)}? Ese día volverá a estar disponible.`,
      confirmLabel: "Eliminar",
    });
    if (!ok) return;

    setDeletingId(holiday.id);
    try {
      await deleteHoliday(holiday.id);
      setHolidays((prev) => prev.filter((item) => item.id !== holiday.id));
      if (editing?.id === holiday.id) setEditing(null);
      toast.success("Feriado eliminado");
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al eliminar feriado"));
    } finally {
      setDeletingId(null);
    }
  }

  const todayKey = toBusinessDayKey(new Date().toISOString());
  const upcoming = holidays.filter((holiday) => holiday.date >= todayKey);
  const past = holidays.filter((holiday) => holiday.date < todayKey);

  function renderList(items: Holiday[], faded = false) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted">
          {faded ? "Sin feriados pasados." : "No hay feriados configurados."}
        </p>
      );
    }

    return (
      <ul className="grid items-start gap-3 sm:grid-cols-2">
        {items.map((holiday) => (
          <ListCard
            key={holiday.id}
            title={holiday.name}
            subtitle="Feriado del negocio"
            footerLeft={formatDateKey(holiday.date)}
            faded={faded}
            footerRight={
              <AppointmentMenu
                ariaLabel={`Acciones de ${holiday.name}`}
                busy={deletingId === holiday.id}
                items={[
                  {
                    label: "Editar",
                    onSelect: () => startEdit(holiday),
                  },
                  {
                    label: "Eliminar",
                    danger: true,
                    onSelect: () => handleDelete(holiday),
                  },
                ]}
              />
            }
          />
        ))}
      </ul>
    );
  }

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title="Feriados"
        highlight="del negocio."
        description="Fechas globales que aplican a todos los barberos."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
            Agregar feriado
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
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
              value={name}
              placeholder="Ej: Navidad"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <p className="mt-3 text-xs text-muted">
            Si ya hay turnos ese día, no se cancelan automáticamente.
          </p>
          <Button
            variant="primaryBlock"
            className="mt-4 w-full"
            disabled={saving}
            onClick={handleCreate}
          >
            <Plus size={16} aria-hidden="true" />
            {saving ? "Agregando..." : "Agregar feriado"}
          </Button>
          {warning && (
            <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
              {warning}
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          {editing && (
            <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <h4 className="mb-3 font-barlow font-bold uppercase text-xs tracking-widest">
                Editar feriado
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="holiday-edit-date"
                  label="Fecha"
                  type="date"
                  value={editDate}
                  onChange={(event) => setEditDate(event.target.value)}
                />
                <Input
                  id="holiday-edit-name"
                  label="Nombre"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </div>
              <p className="mt-3 text-xs text-muted">
                Si la nueva fecha tiene turnos, no se cancelan automáticamente.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="primaryBlock"
                  className="flex-1"
                  disabled={savingEdit}
                  onClick={handleSaveEdit}
                >
                  {savingEdit ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-barlow font-bold uppercase text-sm tracking-widest">
              Próximos ({upcoming.length})
            </h3>
          </div>
          {listError && (
            <p className="mb-4 text-sm text-destructive">{listError}</p>
          )}
          {loading ? (
            <Loader label="Cargando feriados..." height="card" />
          ) : (
            <>
              {renderList(upcoming)}
              {past.length > 0 && (
                <div className="mt-6 border-t border-border pt-5">
                  <h4 className="mb-3 font-barlow font-bold uppercase text-xs tracking-widest text-muted">
                    Pasados ({past.length})
                  </h4>
                  {renderList(past, true)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Section>
  );
}
