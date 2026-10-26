import { useEffect, useState } from "react";
import { CalendarPlus, Info, Trash2 } from "lucide-react";
import type { Availability, DayOfWeek, Staff } from "@/types/domain";
import { availabilityService } from "@/services/availabilityService";
import { getErrorMessage } from "@/api/apiError";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { Alert, EmptyState, ErrorState, LoadingBlock } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { ConfirmDialog } from "@/components/ui/Modal";
import { DAY_LABELS } from "@/constants/domain";
import { DAY_ORDER } from "@/utils/date";
import { formatClockRange } from "@/utils/format";

interface StaffAvailabilityPanelProps {
  staff: Staff[];
  /** Pre-selects a person (used by the staff table's "manage hours" action). */
  initialStaffId?: string;
}

/**
 * Admin-side weekly schedule editor.
 *
 * `GET /availability` is not tenant-filtered by the backend, so this panel only
 * ever reads through `GET /availability/staff/:staffId` — the one endpoint that
 * is guaranteed to stay inside the selected person's calendar.
 */
export function StaffAvailabilityPanel({ staff, initialStaffId }: StaffAvailabilityPanelProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    () => initialStaffId || staff[0]?.id || "",
  );
  const [day, setDay] = useState<DayOfWeek>("MONDAY");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [pendingRemoval, setPendingRemoval] = useState<Availability | null>(null);

  useEffect(() => {
    if (staff.length === 0) return;
    if (!staff.some((member) => member.id === selectedStaffId)) {
      setSelectedStaffId(staff[0]?.id ?? "");
    }
  }, [selectedStaffId, staff]);

  const slotsQuery = useAsyncData<Availability[]>(
    async () => {
      if (!selectedStaffId) return [];
      const response = await availabilityService.listByStaff(selectedStaffId, 1, 100);
      return response.data;
    },
    [selectedStaffId],
    { enabled: Boolean(selectedStaffId) },
  );

  const selectedStaff = staff.find((member) => member.id === selectedStaffId) ?? null;
  const slots = slotsQuery.data ?? [];

  const addSlot = useAsyncAction(async () => {
    if (!selectedStaffId) throw new Error("Choose a team member first.");
    return availabilityService.create({ staffId: selectedStaffId, dayOfWeek: day, startTime, endTime });
  });

  const removeSlot = useAsyncAction(async (slot: Availability) => availabilityService.remove(slot.id));

  const handleAdd = async () => {
    if (endTime <= startTime) return;
    try {
      await addSlot.run();
      slotsQuery.reload();
    } catch {
      // `addSlot.error` renders below.
    }
  };

  const handleRemove = async () => {
    if (!pendingRemoval) return;
    try {
      await removeSlot.run(pendingRemoval);
      setPendingRemoval(null);
      slotsQuery.reload();
    } catch {
      setPendingRemoval(null);
    }
  };

  if (staff.length === 0) {
    return (
      <EmptyState
        title="No team members yet"
        message="Add someone to the roster first — weekly hours are configured per person."
      />
    );
  }

  const grouped = DAY_ORDER.map((weekday) => ({
    weekday,
    items: slots
      .filter((slot) => slot.dayOfWeek === weekday)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  const invalidRange = endTime <= startTime;

  return (
    <div className="stack stack--loose">
      <Alert tone="info" title="How the receptionist reads this">
        The agent only offers a slot when the requested time falls inside one of these weekly windows and
        does not overlap an existing booking. Without hours, the person is never proposed.
      </Alert>

      <div className="availability-toolbar">
        <Field label="Team member" htmlFor="availability-staff">
          <Select
            id="availability-staff"
            value={selectedStaffId}
            onChange={(event) => setSelectedStaffId(event.currentTarget.value)}
          >
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {member.role}
                {member.isActive ? "" : " (inactive)"}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {slotsQuery.error ? (
        <ErrorState error={slotsQuery.error} onRetry={slotsQuery.reload} />
      ) : slotsQuery.isLoading ? (
        <LoadingBlock label="Loading weekly hours…" />
      ) : (
        <div className="availability-week">
          {grouped.map(({ weekday, items }) => (
            <div
              className={`availability-day${items.length === 0 ? " availability-day--empty" : ""}`}
              key={weekday}
            >
              <p className="availability-day__name">{DAY_LABELS[weekday]}</p>
              {items.length === 0 ? (
                <p className="availability-day__closed">Not working</p>
              ) : (
                <ul className="availability-day__list">
                  {items.map((slot) => (
                    <li className="availability-day__slot" key={slot.id}>
                      <span>{formatClockRange(slot.startTime, slot.endTime)}</span>
                      <button
                        type="button"
                        className="availability-day__remove"
                        onClick={() => setPendingRemoval(slot)}
                        aria-label={`Remove ${DAY_LABELS[weekday]} slot`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card card--padded">
        <div className="section__head">
          <p className="section__title">
            <CalendarPlus size={15} aria-hidden="true" style={{ marginRight: 6, verticalAlign: "-2px" }} />
            Add a working window
          </p>
        </div>

        {selectedStaff ? (
          <p className="text-sm text-muted" style={{ marginBottom: "12px" }}>
            Adding to <strong>{selectedStaff.name}</strong>. Windows must not overlap; the backend stores
            each one as its own record.
          </p>
        ) : null}

        {addSlot.error ? (
          <div style={{ marginBottom: "12px" }}>
            <Alert tone="error">{getErrorMessage(addSlot.error)}</Alert>
          </div>
        ) : null}

        <div className="availability-add">
          <Field label="Day" htmlFor="availability-day">
            <Select
              id="availability-day"
              value={day}
              onChange={(event) => setDay(event.currentTarget.value as DayOfWeek)}
            >
              {DAY_ORDER.map((weekday) => (
                <option key={weekday} value={weekday}>
                  {DAY_LABELS[weekday]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="From" htmlFor="availability-start">
            <input
              id="availability-start"
              className="input"
              type="time"
              step={900}
              value={startTime}
              onChange={(event) => setStartTime(event.currentTarget.value)}
            />
          </Field>

          <Field
            label="To"
            htmlFor="availability-end"
            error={invalidRange ? "The end time must be after the start time" : undefined}
          >
            <input
              id="availability-end"
              className="input"
              type="time"
              step={900}
              value={endTime}
              onChange={(event) => setEndTime(event.currentTarget.value)}
            />
          </Field>

          <Button
            leadingIcon={<CalendarPlus size={15} />}
            isLoading={addSlot.isPending}
            disabled={!selectedStaffId || invalidRange}
            onClick={handleAdd}
          >
            Add window
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted">
        <Info size={12} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "-2px" }} />
        Slots are stored in the business's local wall-clock time and every appointment stores its own ISO
        timestamps, so changes here never rewrite existing bookings.
      </p>

      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        title="Remove this working window?"
        message={
          pendingRemoval
            ? `${DAY_LABELS[pendingRemoval.dayOfWeek]} ${formatClockRange(
                pendingRemoval.startTime,
                pendingRemoval.endTime,
              )} will no longer be offered to customers. Existing appointments are unaffected.`
            : ""
        }
        confirmLabel="Remove window"
        isConfirming={removeSlot.isPending}
        onConfirm={handleRemove}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  );
}
