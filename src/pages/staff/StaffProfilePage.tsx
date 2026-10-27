import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Briefcase, CalendarDays, Clock3, IdCard, Mail, ShieldCheck } from "lucide-react";
import type { Service } from "@/types/domain";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { ApiClientError } from "@/api/apiError";
import { staffService } from "@/services/staffService";
import { serviceCatalogService } from "@/services/serviceCatalogService";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar, Badge, StatusBadge } from "@/components/ui/Badge";
import { Alert, EmptyState, ErrorState, LoadingBlock } from "@/components/ui/Feedback";
import { AvailabilitySummary } from "@/features/availability/WeeklyScheduleEditor";
import { PATHS } from "@/routes/paths";
import { formatCurrency, formatDate, formatDateTimeRange, formatRelative } from "@/utils/format";

export default function StaffProfilePage() {
  const { user } = useAuth();
  const staffId = user?.staffId ?? "";

  const staffQuery = useAsyncData((signal) => staffService.getById(staffId, signal), [staffId], {
    enabled: Boolean(staffId),
  });
  const servicesQuery = useAsyncData(() => serviceCatalogService.list({ page: 1, limit: 100 }), [staffId], {
    enabled: Boolean(staffId),
  });

  const staff = staffQuery.data;

  const assignedServices = useMemo(() => {
    const links = staffQuery.data?.services ?? [];
    const catalogue = servicesQuery.data?.data ?? [];
    return links
      .map((link) => catalogue.find((service) => service.id === link.serviceId) ?? null)
      .filter((service): service is Service => service !== null);
  }, [staffQuery.data, servicesQuery.data]);

  if (!staffId) {
    return (
      <ErrorState
        error={
          new ApiClientError(
            "forbidden",
            "This account has the Staff role but is not linked to a roster entry, so there is no profile to show.",
            403,
          )
        }
      />
    );
  }

  if (staffQuery.error) {
    return (
      <>
        <PageHeader title="My profile" />
        <ErrorState error={staffQuery.error} onRetry={staffQuery.reload} />
      </>
    );
  }

  if (staffQuery.isLoading || !staff) {
    return (
      <>
        <PageHeader title="My profile" />
        <LoadingBlock label="Loading your profile…" />
      </>
    );
  }

  const weeklyHours = staff.availabilities ?? [];
  const recentAppointments = (staff.appointments ?? []).slice(0, 5);

  return (
    <>
      <PageHeader
        title="My profile"
        description="Your roster entry as the AI receptionist sees it. Business administrators maintain these details."
      />

      <div className="split">
        <div className="stack stack--loose">
          <div className="card card--padded">
            <div className="table-person">
              <Avatar name={staff.name} size="lg" />
              <div className="table-person__body">
                <p className="card__title">{staff.name}</p>
                <p className="card__subtitle">{staff.role}</p>
              </div>
              <div className="table-actions">
                {staff.isActive ? (
                  <Badge tone="success">Available for bookings</Badge>
                ) : (
                  <Badge tone="neutral">Inactive</Badge>
                )}
              </div>
            </div>

            {staff.bio ? (
              <p className="text-sm text-secondary section">{staff.bio}</p>
            ) : (
              <p className="muted-block section">
                No bio yet. A business administrator can add one so the receptionist has something to
                say about you.
              </p>
            )}

            <div className="detail-list section">
              <div className="detail-list__item">
                <p className="detail-list__label">Account email</p>
                <p className="detail-list__value row">
                  <Mail size={14} aria-hidden="true" className="text-muted" />
                  {user?.email ?? "—"}
                </p>
              </div>
              <div className="detail-list__item">
                <p className="detail-list__label">Business</p>
                <p className="detail-list__value row">
                  <Briefcase size={14} aria-hidden="true" className="text-muted" />
                  {staff.business?.name ?? user?.business?.name ?? "—"}
                </p>
              </div>
              <div className="detail-list__item">
                <p className="detail-list__label">Roster ID</p>
                <p className="detail-list__value text-mono">{staff.id}</p>
              </div>
              <div className="detail-list__item">
                <p className="detail-list__label">Added to the roster</p>
                <p className="detail-list__value">{formatDate(staff.createdAt)}</p>
              </div>
            </div>

            <Alert tone="info" title="Profile editing is not self-service">
              The API only lets administrators update roster entries, and it exposes no password-change
              endpoint. Ask a business administrator for changes.
            </Alert>
          </div>

          <div className="card">
            <div className="card__header">
              <div>
                <p className="card__title">Recent appointments</p>
                <p className="card__subtitle">The last bookings recorded against your roster entry.</p>
              </div>
              <Link className="btn btn--ghost btn--sm" to={PATHS.staffAppointments}>
                Open calendar
              </Link>
            </div>

            {recentAppointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No bookings yet"
                message="Appointments assigned to you will be listed here."
              />
            ) : (
              <div className="record-list">
                {recentAppointments.map((appointment) => (
                  <div className="record-list__item" key={appointment.id}>
                    <div className="row row--between row--wrap">
                      <span className="table-person__name">
                        {appointment.customer?.name ?? "Unknown customer"}
                      </span>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <p className="text-sm text-secondary">
                      {formatDateTimeRange(appointment.startTime, appointment.endTime)}
                    </p>
                    <p className="text-xs text-muted">{formatRelative(appointment.startTime)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="stack stack--loose">
          <div className="card card--padded">
            <div className="row">
              <IdCard size={16} aria-hidden="true" className="text-muted" />
              <p className="card__title">Services I perform</p>
            </div>
            <p className="card__subtitle">
              The receptionist only offers you for services linked to this roster entry.
            </p>

            {servicesQuery.isLoading ? (
              <LoadingBlock label="Loading the catalogue…" />
            ) : assignedServices.length === 0 ? (
              <p className="muted-block section">
                No services are linked to this roster entry. A business administrator can create a new
                entry with the right assignments.
              </p>
            ) : (
              <div className="stack stack--tight section">
                {assignedServices.map((service) => (
                  <div className="record-list__row" key={service.id}>
                    <div>
                      <p className="table-person__name">{service.name}</p>
                      <p className="table-person__meta">{service.durationMinutes} minutes</p>
                    </div>
                    <span className="text-sm nowrap">{formatCurrency(service.price)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card card--padded">
            <div className="row row--between row--wrap">
              <div className="row">
                <Clock3 size={16} aria-hidden="true" className="text-muted" />
                <p className="card__title">Weekly hours</p>
              </div>
              <Link className="btn btn--ghost btn--sm" to={PATHS.staffSchedule}>
                Edit
              </Link>
            </div>
            <p className="card__subtitle">Windows the AI receptionist may book into.</p>

            <div className="section">
              <AvailabilitySummary slots={weeklyHours} />
            </div>

            {weeklyHours.length === 0 ? (
              <Alert tone="warning">
                No hours are saved, so the receptionist cannot offer this profile to customers.
              </Alert>
            ) : null}
          </div>

          <div className="card card--padded">
            <div className="row">
              <ShieldCheck size={16} aria-hidden="true" className="text-muted" />
              <p className="card__title">Access level</p>
            </div>
            <p className="card__subtitle">What this account is allowed to do.</p>
            <div className="stack stack--tight section">
              <p className="text-sm text-secondary">See and update only appointments assigned to you.</p>
              <p className="text-sm text-secondary">Replace your own weekly availability.</p>
              <p className="text-sm text-secondary">
                Cannot create appointments, customers, services or other staff accounts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
