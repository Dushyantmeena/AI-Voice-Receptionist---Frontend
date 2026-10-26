import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Sparkles,
} from "lucide-react";
import type { Appointment } from "@/types/domain";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { ApiClientError } from "@/api/apiError";
import { appointmentService } from "@/services/appointmentService";
import { staffService } from "@/services/staffService";
import { PageHeader, StatCard } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Alert, EmptyState, ErrorState, LoadingBlock } from "@/components/ui/Feedback";
import { AvailabilitySummary } from "@/features/availability/WeeklyScheduleEditor";
import { PATHS } from "@/routes/paths";
import { isToday } from "@/utils/date";
import { formatCurrency, formatDateTimeRange, formatRelative, formatTime } from "@/utils/format";

/**
 * Staff landing page.
 *
 * `GET /appointments` is automatically narrowed to the signed-in staff member by
 * `requireStaffAppointmentScope`, so no staffId filter is needed here.
 */
export default function StaffOverviewPage() {
  const { user } = useAuth();
  const staffId = user?.staffId ?? "";
  const firstName = (user?.staff?.name ?? user?.name ?? "").split(" ")[0] || "there";
  const businessName = user?.business?.name ?? "your business";

  const appointmentsQuery = useAsyncData(
    () => appointmentService.listNewestFirst({ page: 1, limit: 100 }),
    [staffId],
    { enabled: Boolean(staffId) },
  );
  const availabilityQuery = useAsyncData(() => staffService.getMyAvailability(), [staffId], {
    enabled: Boolean(staffId),
  });

  if (!staffId) {
    return (
      <ErrorState
        error={
          new ApiClientError(
            "forbidden",
            "This account has the Staff role but is not linked to a roster entry. A business administrator has to repair the account before the workspace can load.",
            403,
          )
        }
      />
    );
  }

  const appointments = appointmentsQuery.data?.data ?? [];
  const availability = availabilityQuery.data ?? [];

  const now = Date.now();
  const upcoming = appointments
    .filter((appointment) => appointment.status === "BOOKED" && new Date(appointment.startTime).getTime() >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const today = appointments
    .filter((appointment) => isToday(appointment.startTime) && appointment.status !== "CANCELLED")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const completed = appointments.filter((appointment) => appointment.status === "COMPLETED");

  const next = upcoming[0] ?? null;

  const columns: DataTableColumn<Appointment>[] = [
    {
      id: "when",
      header: "When",
      cell: (row) => (
        <div className="table-timestamp">
          <span>{formatDateTimeRange(row.startTime, row.endTime)}</span>
          <span className="table-timestamp__range">{formatRelative(row.startTime)}</span>
        </div>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      cell: (row) => (
        <div className="table-person__body">
          <p className="table-person__name">{row.customer?.name ?? "Unknown customer"}</p>
          <p className="table-person__meta">{row.customer?.phone ?? "No phone on record"}</p>
        </div>
      ),
    },
    {
      id: "service",
      header: "Service",
      cell: (row) => (
        <div className="table-person__body">
          <p className="table-person__name">{row.service?.name ?? "—"}</p>
          <p className="table-person__meta">
            {row.service
              ? `${row.service.durationMinutes} min · ${formatCurrency(row.service.price)}`
              : "Not linked"}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const firstError = appointmentsQuery.error ?? availabilityQuery.error;

  return (
    <>
      <PageHeader
        eyebrow="My workspace"
        title={`Hello, ${firstName}`}
        description={`Your calendar at ${businessName}. Appointments created by the AI receptionist and by the front desk both land here.`}
        actions={
          <Link className="btn btn--secondary" to={PATHS.staffSchedule}>
            <Clock3 size={16} />
            My schedule
          </Link>
        }
      />

      {firstError ? (
        <ErrorState
          error={firstError}
          onRetry={() => {
            appointmentsQuery.reload();
            availabilityQuery.reload();
          }}
        />
      ) : appointmentsQuery.isLoading || availabilityQuery.isLoading ? (
        <LoadingBlock label="Loading your workspace…" />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard
              label="Today"
              value={today.length}
              icon={CalendarDays}
              meta={today[0] ? `First at ${formatTime(today[0].startTime)}` : "Nothing scheduled"}
            />
            <StatCard
              label="Upcoming bookings"
              value={upcoming.length}
              icon={CalendarCheck}
              tone="info"
              meta={next ? `Next ${formatRelative(next.startTime)}` : "Calendar is clear"}
            />
            <StatCard
              label="Completed"
              value={completed.length}
              icon={CheckCircle2}
              tone="success"
              meta="Across the latest 100 bookings"
            />
            <StatCard
              label="Weekly hours"
              value={availability.length}
              icon={Clock3}
              tone="warning"
              meta={availability.length === 0 ? "The AI cannot book you" : "Windows offered to the AI"}
            />
          </div>

          <div className="split section">
            <div className="stack stack--loose">
              <div className="card card--padded">
                <div className="row row--between row--wrap">
                  <div className="row">
                    <span className="chat-link__icon" aria-hidden="true">
                      <Sparkles size={17} />
                    </span>
                    <div>
                      <p className="card__title">Next up</p>
                      <p className="card__subtitle">The soonest confirmed appointment assigned to you.</p>
                    </div>
                  </div>
                  <Link className="btn btn--ghost btn--sm" to={PATHS.staffAppointments}>
                    All appointments
                  </Link>
                </div>

                {!next ? (
                  <div className="section">
                    <EmptyState
                      icon={CalendarCheck}
                      title="Nothing booked yet"
                      message="When the receptionist books a customer with you, it appears here with the customer's contact details."
                    />
                  </div>
                ) : (
                  <div className="section">
                    <div className="row row--wrap">
                      <Badge tone="brand" dot={false}>
                        {formatDateTimeRange(next.startTime, next.endTime)}
                      </Badge>
                      <Badge tone="info" dot={false}>
                        {formatRelative(next.startTime)}
                      </Badge>
                    </div>

                    <div className="detail-list section">
                      <div className="detail-list__item">
                        <p className="detail-list__label">Customer</p>
                        <p className="detail-list__value">{next.customer?.name ?? "Unknown customer"}</p>
                      </div>
                      <div className="detail-list__item">
                        <p className="detail-list__label">Phone</p>
                        <p className="detail-list__value">{next.customer?.phone ?? "Not captured"}</p>
                      </div>
                      <div className="detail-list__item">
                        <p className="detail-list__label">Service</p>
                        <p className="detail-list__value">{next.service?.name ?? "Not linked"}</p>
                      </div>
                      <div className="detail-list__item">
                        <p className="detail-list__label">Price</p>
                        <p className="detail-list__value">
                          {next.service ? formatCurrency(next.service.price) : "—"}
                        </p>
                      </div>
                    </div>

                    {next.notes ? (
                      <p className="muted-block section">{next.notes}</p>
                    ) : (
                      <p className="text-sm text-muted section">No notes were added to this booking.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card__header">
                  <div>
                    <p className="card__title">Today&apos;s appointments</p>
                    <p className="card__subtitle">Everything assigned to you for the current day.</p>
                  </div>
                  <Link className="btn btn--ghost btn--sm" to={PATHS.staffAppointments}>
                    Manage
                    <ArrowRight size={14} />
                  </Link>
                </div>

                <DataTable
                  columns={columns}
                  rows={today}
                  rowKey={(row) => row.id}
                  caption="Today's appointments"
                  empty={
                    <EmptyState
                      icon={CalendarDays}
                      title="No appointments today"
                      message="Use the time to review your weekly schedule."
                      action={
                        <Link className="btn btn--secondary btn--sm" to={PATHS.staffSchedule}>
                          Review my hours
                        </Link>
                      }
                    />
                  }
                />
              </div>
            </div>

            <div className="stack stack--loose">
              <div className="card card--padded">
                <p className="card__title">My weekly hours</p>
                <p className="card__subtitle">
                  The AI receptionist only offers slots that fall inside these windows.
                </p>

                {availability.length === 0 ? (
                  <Alert tone="warning" title="No working hours set">
                    Without hours the receptionist cannot offer you any slot. Add them on the weekly
                    schedule page.
                  </Alert>
                ) : (
                  <div className="section">
                    <AvailabilitySummary slots={availability} />
                  </div>
                )}

                <Link className="btn btn--secondary btn--sm section" to={PATHS.staffSchedule}>
                  Edit weekly hours
                </Link>
              </div>

              <div className="card card--padded">
                <p className="card__title">My account</p>
                <div className="detail-list detail-list--single section">
                  <div className="detail-list__item">
                    <p className="detail-list__label">Signed in as</p>
                    <p className="detail-list__value">{user?.email ?? "—"}</p>
                  </div>
                  <div className="detail-list__item">
                    <p className="detail-list__label">Business</p>
                    <p className="detail-list__value">{businessName}</p>
                  </div>
                  <div className="detail-list__item">
                    <p className="detail-list__label">Roster role</p>
                    <p className="detail-list__value">{user?.staff?.role ?? "Staff"}</p>
                  </div>
                </div>
                <Link className="btn-link" to={PATHS.staffProfile}>
                  Open my profile
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
