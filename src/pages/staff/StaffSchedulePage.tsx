import { useState } from "react";
import { Clock3, Info } from "lucide-react";
import type { AvailabilitySlotInput } from "@/services/staffService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { staffService } from "@/services/staffService";
import { getErrorMessage, ApiClientError } from "@/api/apiError";
import { PageHeader } from "@/components/ui/PageHeader";
import { Alert, ErrorState, LoadingBlock } from "@/components/ui/Feedback";
import { AvailabilitySummary, WeeklyScheduleEditor } from "@/features/availability/WeeklyScheduleEditor";

/**
 * Staff self-service availability.
 *
 * `PUT /staff/me/availability` replaces the whole week atomically, so the editor
 * works on one draft and saves it in a single request.
 */
export default function StaffSchedulePage() {
  const { user } = useAuth();
  const toast = useToast();
  const staffId = user?.staffId ?? "";

  const [attempted, setAttempted] = useState(false);

  const availabilityQuery = useAsyncData(() => staffService.getMyAvailability(), [staffId], {
    enabled: Boolean(staffId),
  });

  const slots = availabilityQuery.data ?? [];

  // The editor seeds its draft from the API response, so it is keyed by the
  // saved schedule and only mounted after the first successful load.
  const signature =
    slots.length === 0
      ? "empty"
      : slots
          .map((slot) => `${slot.id}:${slot.dayOfWeek}:${slot.startTime}:${slot.endTime}`)
          .sort()
          .join("|");

  const save = useAsyncAction(async (payload: AvailabilitySlotInput[]) =>
    staffService.updateMyAvailability(payload),
  );

  const handleSave = async (payload: AvailabilitySlotInput[]) => {
    setAttempted(true);
    try {
      await save.run(payload);
      toast.success(
        "Weekly hours saved",
        "The AI receptionist will only offer appointment slots that fall inside these windows.",
      );
      availabilityQuery.reload();
    } catch (error) {
      toast.error("Could not save your hours", getErrorMessage(error));
      throw error;
    }
  };

  if (!staffId) {
    return (
      <ErrorState
        error={
          new ApiClientError(
            "forbidden",
            "This account has the Staff role but is not linked to a roster entry, so no availability can be edited.",
            403,
          )
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title="My schedule"
        description="These are the hours the AI receptionist is allowed to book you into. Saving replaces the whole week at once."
      />

      {availabilityQuery.error ? (
        <ErrorState error={availabilityQuery.error} onRetry={availabilityQuery.reload} />
      ) : availabilityQuery.isLoading ? (
        <LoadingBlock label="Loading your weekly hours…" />
      ) : (
        <div className="split">
          <div className="card card--padded">
            <div className="panel-head">
              <span className="chat-link__icon" aria-hidden="true">
                <Clock3 size={16} />
              </span>
              <div>
                <p className="card__title">Weekly working hours</p>
                <p className="card__subtitle">
                  Add as many windows per day as you need — for example a morning and an evening shift.
                </p>
              </div>
            </div>

            {attempted && save.error ? (
              <Alert tone="error">{getErrorMessage(save.error)}</Alert>
            ) : null}

            <WeeklyScheduleEditor
              key={signature}
              initialSlots={slots}
              isSaving={save.isPending}
              onSave={handleSave}
            />
          </div>

          <div className="stack stack--loose">
            <div className="card card--padded">
              <p className="card__title">Current summary</p>
              <p className="card__subtitle">What the receptionist uses right now.</p>
              <div className="section">
                <AvailabilitySummary slots={slots} />
              </div>
              {slots.length === 0 ? (
                <Alert tone="warning" title="You are currently unbookable">
                  With no windows saved, the AI receptionist cannot offer this profile to customers.
                </Alert>
              ) : null}
            </div>

            <div className="card card--padded">
              <div className="row">
                <Info size={16} aria-hidden="true" className="text-muted" />
                <p className="card__title">How hours are used</p>
              </div>
              <div className="stack stack--tight section">
                <p className="text-sm text-secondary">
                  The agent checks these windows before proposing a slot, then verifies the slot is not
                  already booked.
                </p>
                <p className="text-sm text-secondary">
                  Times are stored as plain <code className="text-mono">HH:mm</code> values and applied
                  every week — there is no holiday or date-exception endpoint.
                </p>
                <p className="text-sm text-secondary">
                  Business administrators can also add or remove individual slots from the Availability
                  page.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
