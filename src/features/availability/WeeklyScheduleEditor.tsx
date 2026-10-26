import { useMemo, useState } from "react";
import { CalendarDays, Plus, Save, Trash2 } from "lucide-react";
import type { Availability, DayOfWeek } from "@/types/domain";
import type { AvailabilitySlotInput } from "@/services/staffService";
import { Alert } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { DAY_LABELS } from "@/constants/domain";
import { DAY_ORDER } from "@/utils/date";
import { formatClockRange } from "@/utils/format";

type DaySlots = Record<DayOfWeek, AvailabilitySlotInput[]>;

interface DraftSlot {
  /** Stable key for React while the slot is only local state. */
  key: string;
  startTime: string;
  endTime: string;
}

type DraftSchedule = Record<DayOfWeek, DraftSlot[]>;

let slotKeyCounter = 0;
function nextSlotKey(): string {
  slotKeyCounter += 1;
  return `slot-${slotKeyCounter}`;
}

function toDraft(slots: Availability[]): DraftSchedule {
  const draft = DAY_ORDER.reduce((accumulator, day) => {
    accumulator[day] = [];
    return accumulator;
  }, {} as DraftSchedule);

  for (const slot of slots) {
    const day = slot.dayOfWeek;
    if (!draft[day]) continue;
    draft[day].push({
      key: slot.id || nextSlotKey(),
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  }

  for (const day of DAY_ORDER) {
    draft[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return draft;
}

function flatten(draft: DraftSchedule): DaySlots {
  const result = DAY_ORDER.reduce((accumulator, day) => {
    accumulator[day] = draft[day].map(({ startTime, endTime }) => ({
      dayOfWeek: day,
      startTime,
      endTime,
    }));
    return accumulator;
  }, {} as DaySlots);
  return result;
}

interface WeeklyScheduleEditorProps {
  initialSlots: Availability[];
  isSaving: boolean;
  /** Resolves once the schedule is stored; reject to keep the draft dirty. */
  onSave: (slots: AvailabilitySlotInput[]) => Promise<void> | void;
}

/**
 * Weekly hours editor used by staff self-service.
 *
 * The backend replaces the whole schedule in one call (`PUT /staff/me/availability`),
 * so the component keeps one draft and saves it atomically.
 */
export function WeeklyScheduleEditor({ initialSlots, isSaving, onSave }: WeeklyScheduleEditorProps) {
  const [draft, setDraft] = useState<DraftSchedule>(() => toDraft(initialSlots));
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const slots = useMemo(() => flatten(draft), [draft]);

  const update = (day: DayOfWeek, next: DraftSlot[]) => {
    setDraft((current) => ({ ...current, [day]: next }));
    setDirty(true);
    setError(null);
  };

  const addSlot = (day: DayOfWeek) => {
    const existing = draft[day];
    const last = existing[existing.length - 1];
    const startTime = last ? last.endTime : "09:00";
    const endTime = last ? (last.endTime >= "17:00" ? "23:00" : "17:00") : "17:00";
    update(day, [...existing, { key: nextSlotKey(), startTime, endTime }]);
  };

  const removeSlot = (day: DayOfWeek, key: string) => {
    update(
      day,
      draft[day].filter((slot) => slot.key !== key),
    );
  };

  const patchSlot = (day: DayOfWeek, key: string, patch: Partial<DraftSlot>) => {
    update(
      day,
      draft[day].map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)),
    );
  };

  const handleSave = async () => {
    for (const day of DAY_ORDER) {
      for (const slot of draft[day]) {
        if (!slot.startTime || !slot.endTime) {
          setError(`${DAY_LABELS[day]}: every slot needs a start and an end time.`);
          return;
        }
        if (slot.endTime <= slot.startTime) {
          setError(`${DAY_LABELS[day]}: the end time must be after the start time.`);
          return;
        }
      }
    }

    setError(null);
    const flattened = DAY_ORDER.flatMap((day) => slots[day]);

    try {
      await onSave(flattened);
      setDirty(false);
    } catch {
      // The caller reports the failure; keep the draft so it can be retried.
    }
  };

  const totalSlots = DAY_ORDER.reduce((count, day) => count + draft[day].length, 0);

  return (
    <div className="stack">
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="schedule-editor">
        {DAY_ORDER.map((day) => (
          <div className="schedule-row" key={day}>
            <div className="schedule-row__day">
              <CalendarDays size={15} aria-hidden="true" />
              {DAY_LABELS[day]}
            </div>

            <div className="schedule-row__slots">
              {draft[day].length === 0 ? (
                <span className="schedule-row__closed">Not working</span>
              ) : (
                draft[day].map((slot) => (
                  <div className="schedule-slot" key={slot.key}>
                    <input
                      className="input schedule-slot__time"
                      type="time"
                      step={900}
                      value={slot.startTime}
                      aria-label={`${DAY_LABELS[day]} start time`}
                      onChange={(event) =>
                        patchSlot(day, slot.key, { startTime: event.currentTarget.value })
                      }
                    />
                    <span className="schedule-slot__dash" aria-hidden="true">
                      –
                    </span>
                    <input
                      className="input schedule-slot__time"
                      type="time"
                      step={900}
                      value={slot.endTime}
                      aria-label={`${DAY_LABELS[day]} end time`}
                      onChange={(event) =>
                        patchSlot(day, slot.key, { endTime: event.currentTarget.value })
                      }
                    />
                    <button
                      type="button"
                      className="schedule-slot__remove"
                      onClick={() => removeSlot(day, slot.key)}
                      aria-label={`Remove ${DAY_LABELS[day]} slot`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<Plus size={14} />}
              onClick={() => addSlot(day)}
            >
              Add hours
            </Button>
          </div>
        ))}
      </div>

      <div className="row row--between row--wrap">
        <p className="text-sm text-muted">
          {totalSlots === 0
            ? "With no hours set, the receptionist will not offer this person any slot."
            : `${totalSlots} weekly slot${totalSlots === 1 ? "" : "s"} · saved as a full-week replacement.`}
        </p>
        <div className="row">
          <Button
            variant="secondary"
            onClick={() => {
              setDraft(toDraft(initialSlots));
              setError(null);
              setDirty(false);
            }}
            disabled={!dirty || isSaving}
          >
            Reset
          </Button>
          <Button leadingIcon={<Save size={15} />} isLoading={isSaving} onClick={handleSave}>
            Save weekly hours
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Human-readable summary of a staff member's configured week. */
export function AvailabilitySummary({ slots }: { slots: Availability[] }) {
  if (slots.length === 0) {
    return <span className="text-sm text-muted">No working hours</span>;
  }

  const byDay = DAY_ORDER.map((day) => ({
    day,
    ranges: slots
      .filter((slot) => slot.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  })).filter((entry) => entry.ranges.length > 0);

  return (
    <div className="availability-summary">
      {byDay.map(({ day, ranges }) => (
        <div className="availability-summary__row" key={day}>
          <span className="availability-summary__day">{DAY_LABELS[day]}</span>
          <span className="availability-summary__ranges">
            {ranges.map((range) => formatClockRange(range.startTime, range.endTime)).join(", ")}
          </span>
        </div>
      ))}
    </div>
  );
}
