import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { staffService } from "@/services/staffService";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, LoadingBlock } from "@/components/ui/Feedback";
import { StaffAvailabilityPanel } from "@/features/availability/StaffAvailabilityPanel";

/**
 * Admin view of working hours.
 *
 * The AI tools read availability per staff member, so this page is organised the
 * same way: pick a person, then edit the weekly windows they can be booked in.
 */
export default function AvailabilityPage() {
  const { user } = useAuth();
  const businessId = user?.businessId ?? "";
  const [searchParams] = useSearchParams();
  const initialStaffId = searchParams.get("staffId") ?? undefined;

  const staffQuery = useAsyncData(() => staffService.list({ page: 1, limit: 100 }), [businessId], {
    enabled: Boolean(businessId),
  });

  return (
    <>
      <PageHeader
        title="Availability"
        description="Weekly working windows per team member. These are the only times the AI receptionist will offer to customers."
      />

      {staffQuery.error ? (
        <ErrorState error={staffQuery.error} onRetry={staffQuery.reload} />
      ) : staffQuery.isLoading ? (
        <LoadingBlock label="Loading the roster…" />
      ) : (
        <StaffAvailabilityPanel staff={staffQuery.data?.data ?? []} initialStaffId={initialStaffId} />
      )}
    </>
  );
}
