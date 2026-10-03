import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Section } from "../../components/ui/Section";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { getErrorMessage } from "../../lib/api";
import {
  getBarberById,
  updateBarberProfile,
  type Barber,
} from "../../lib/appointments";

const WEEKDAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

function toDayKey(value: string): string {
  return value.slice(0, 10);
}

export function BarberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [barber, setBarber] = useState<Barber | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [daysOff, setDaysOff] = useState<string[]>([]);
  const [weeklyDaysOff, setWeeklyDaysOff] = useState<number[]>([]);
  const [newDay, setNewDay] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      try {
        const data = await getBarberById(id);
        if (cancelled) return;
        setBarber(data);
        setName(data.name);
        setStart(data.barberProfile?.workingHours?.start ?? "09:00");
        setEnd(data.barberProfile?.workingHours?.end ?? "18:00");
        setDaysOff((data.barberProfile?.daysOff ?? []).map(toDayKey));
        setWeeklyDaysOff(data.barberProfile?.weeklyDaysOff ?? []);
      } catch (err) {
        if (!cancelled) {
          setLoadError(getErrorMessage(err, "Error al cargar barbero"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function toggleWeekday(value: number) {
    setWeeklyDaysOff((prev) =>
      prev.includes(value)
        ? prev.filter((d) => d !== value)
        : [...prev, value].sort(),
    );
  }

  async function handleSave() {
    if (!id) return;
    setError("");
    setSuccess("");
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Nombre mínimo 2 caracteres");
      return;
    }
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)
    ) {
      setError("Jornada inválida, use HH:MM");
      return;
    }
    if (start >= end) {
      setError("La salida debe ser posterior a la entrada");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateBarberProfile(id, {
        name: trimmedName,
        workingHours: { start, end },
        daysOff,
        weeklyDaysOff,
      });
      setBarber(updated);
      setSuccess("Barbero actualizado");
    } catch (err) {
      setError(getErrorMessage(err, "Error al guardar cambios"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Section>
        <SectionHeader
          eyebrow="Panel — Admin"
          title="Barbero"
          highlight="detalle."
          description="Cargando datos del barbero."
        />
        <p className="mt-6 text-sm text-muted">Cargando...</p>
      </Section>
    );
  }

  if (loadError || !barber) {
    return (
      <Section>
        <SectionHeader
          eyebrow="Panel — Admin"
          title="Barbero"
          highlight="detalle."
          description="No se pudo cargar el barbero."
        />
        <p className="mt-6 text-sm text-destructive">
          {loadError || "Barbero no encontrado."}
        </p>
        <Link
          to="/app/barbers"
          className="mt-4 inline-flex items-center gap-1 text-primary text-xs font-semibold tracking-wide hover:opacity-80 transition-opacity"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Volver al listado
        </Link>
      </Section>
    );
  }

  return (
    <Section>
      <SectionHeader
        eyebrow="Panel — Admin"
        title={barber.name}
        highlight="detalle."
        description={barber.email}
      />
      <Link
        to="/app/barbers"
        className="mt-4 inline-flex items-center gap-1 text-primary text-xs font-semibold tracking-wide hover:opacity-80 transition-opacity"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Volver al listado
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
            Datos
          </h3>
          <Input
            id="barber-name"
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
            Jornada laboral
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="wh-start"
              label="Entrada"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <Input
              id="wh-end"
              label="Salida"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
            Francos semanales
          </h3>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <label
                key={day.value}
                className={
                  weeklyDaysOff.includes(day.value)
                    ? "border border-primary bg-primary/10 rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-colors"
                    : "border border-border rounded-full px-4 py-2 text-sm cursor-pointer hover:border-primary transition-colors"
                }
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={weeklyDaysOff.includes(day.value)}
                  onChange={() => toggleWeekday(day.value)}
                />
                {day.label}
              </label>
            ))}
          </div>
          {(() => {
            const workingDays = WEEKDAYS.filter(
              (day) => !weeklyDaysOff.includes(day.value),
            );
            return (
              <p className="mt-3 text-sm text-muted">
                {workingDays.length === 7
                  ? "Trabaja todos los días de la semana."
                  : workingDays.length === 0
                    ? "No trabaja ningún día de la semana."
                    : `Trabaja: ${workingDays.map((day) => day.label).join(", ")}.`}
              </p>
            );
          })()}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-barlow font-bold uppercase text-sm tracking-widest mb-4">
            Francos puntuales
          </h3>
          {daysOff.length === 0 ? (
            <p className="text-sm text-muted">Sin francos configurados.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {daysOff.map((day) => (
                <li
                  key={day}
                  className="flex items-center gap-2 text-xs border border-border rounded-full px-3 py-1"
                >
                  {day}
                  <button
                    type="button"
                    aria-label={`Quitar franco ${day}`}
                    onClick={() =>
                      setDaysOff((prev) => prev.filter((d) => d !== day))
                    }
                    className="text-muted hover:text-destructive transition-colors"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Input
              id="dayoff-new"
              label="Agregar franco"
              type="date"
              value={newDay}
              onChange={(e) => setNewDay(e.target.value)}
            />
            <Button
              variant="outline"
              className="self-end"
              onClick={() => {
                if (newDay && !daysOff.includes(newDay)) {
                  setDaysOff((prev) => [...prev, newDay].sort());
                }
                setNewDay("");
              }}
            >
              Agregar
            </Button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive lg:col-span-2">{error}</p>
        )}
        {success && (
          <p className="text-sm text-primary lg:col-span-2">{success}</p>
        )}
        <Button
          variant="primaryBlock"
          className="px-10 w-full lg:w-auto lg:col-span-2 lg:justify-self-end"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </Section>
  );
}
