import { Link } from "react-router-dom";
import {
  CalendarDays,
  CalendarPlus,
  MessagesSquare,
  Scissors,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { ApiClientError } from "@/api/apiError";
import { appointmentService } from "@/services/appointmentService";
import { staffService } from "@/services/staffService";
import { serviceCatalogService } from "@/services/serviceCatalogService";
import { conversationService } from "@/services/conversationService";
import { businessService } from "@/services/businessService";
import { PageHeader, StatCard } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/Feedback";
import { StatusBadge } from "@/components/ui/Badge";
import { ChatLinkCard } from "@/features/business/ChatLinkCard";
import { PATHS } from "@/routes/paths";
import { isToday } from "@/utils/date";
import { excerpt, formatDateTimeRange, formatRelative, formatTime } from "@/utils/format";
import type { Appointment, AppointmentStatus, Conversation } from "@/types/domain";

const STATUS_MIX: { status: AppointmentStatus; label: string; modifier: string }[] = [
  { status: "BOOKED", label: "Booked", modifier: "booked" },
  { status: "COMPLETED", label: "Completed", modifier: "completed" },
  { status: "CANCELLED", label: "Cancelled", modifier: "cancelled" },
  { status: "NO_SHOW", label: "No show", modifier: "no-show" },
];

export default function BusinessOverviewPage() {
  const { user } = useAuth();
  const businessId = user?.businessId ?? "";

  const appointmentsQuery = useAsyncData(
    () => appointmentService.listNewestFirst({ page: 1, limit: 100, businessId }),
    [businessId],
    { enabled: Boolean(businessId) },
  );
  const staffQuery = useAsyncData(() => staffService.list({ page: 1, limit: 50 }), [businessId], {
    enabled: Boolean(businessId),
  });
  const servicesQuery = useAsyncData(() => serviceCatalogService.list({ page: 1, limit: 50 }), [businessId], {
    enabled: Boolean(businessId),
  });
  const conversationsQuery = useAsyncData(
    () => conversationService.list({ page: 1, limit: 5 }),
    [businessId],
    { enabled: Boolean(businessId) },
  );
  const businessQuery = useAsyncData(
    (signal) => businessService.getById(businessId, signal),
    [businessId],
    { enabled: Boolean(businessId) },
  );

  if (!businessId) {
    return (
      <ErrorState
        error={
          new ApiClientError(
            "forbidden",
            "This account is a business administrator but is not linked to a business record. Ask a platform administrator to repair the account.",
            403,
          )
        }
      />
    );
  }

  const appointments = appointmentsQuery.data?.data ?? [];
  const staff = staffQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];
  const conversations = conversationsQuery.data?.data ?? [];
  const business = businessQuery.data;

  const now = Date.now();
  const upcoming = appointments
    .filter((item) => item.status === "BOOKED" && new Date(item.startTime).getTime() >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const today = appointments.filter((item) => isToday(item.startTime) && item.status !== "CANCELLED");

  const mix = STATUS_MIX.map((entry) => ({
    ...entry,
    count: appointments.filter((item) => item.status === entry.status).length,
  }));
  const mixTotal = mix.reduce((sum, entry) => sum + entry.count, 0);

  const activeStaff = staff.filter((member) => member.isActive);
  const activeServices = services.filter((service) => service.isActive);

  const firstError =
    appointmentsQuery.error ?? staffQuery.error ?? servicesQuery.error ?? conversationsQuery.error;

  if (firstError) {
    return (
      <>
        <PageHeader title="Overview" description="Your receptionist at a glance." />
        <ErrorState
          error={firstError}
          onRetry={() => {
            appointmentsQuery.reload();
            staffQuery.reload();
            servicesQuery.reload();
            conversationsQuery.reload();
          }}
        />
      </>
    );
  }

  const isLoading =
    appointmentsQuery.isLoading || staffQuery.isLoading || servicesQuery.isLoading;

  const appointmentColumns: DataTableColumn<Appointment>[] = [
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
          <p className="table-person__meta">{row.staff?.name ?? "Unassigned"}</p>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title={`Good to see you, ${user?.name?.split(" ")[0] ?? "there"}`}
        description={`Live view of ${business?.name ?? "your business"} — everything below comes from the same database the AI receptionist writes to.`}
        actions={
          <Link className="btn btn--primary" to={PATHS.appointments}>
            <CalendarPlus size={16} />
            New appointment
          </Link>
        }
      />

      <div className="stat-grid">
        <StatCard
          label="Upcoming bookings"
          value={upcoming.length}
          icon={CalendarDays}
          meta={`${today.length} scheduled for today`}
        />
        <StatCard
          label="Team members"
          value={activeStaff.length}
          icon={Users}
          tone="info"
          meta={`${staff.length - activeStaff.length} inactive`}
        />
        <StatCard
          label="Active services"
          value={activeServices.length}
          icon={Scissors}
          tone="success"
          meta={`${services.length} in the catalogue`}
        />
        <StatCard
          label="AI conversations"
          value={conversationsQuery.data?.meta.total ?? 0}
          icon={MessagesSquare}
          tone="warning"
          meta={conversations[0] ? `Latest ${formatRelative(conversations[0].createdAt)}` : "No sessions yet"}
        />
      </div>

      <div className="card card--padded section">
        <div className="row row--between row--wrap">
          <div>
            <p className="card__title">Booking mix</p>
            <p className="card__subtitle">
              Status across the {mixTotal} most recent {mixTotal === 1 ? "booking" : "bookings"} on
              record.
            </p>
          </div>
          <Link className="btn btn--ghost btn--sm" to={PATHS.appointments}>
            Open calendar
          </Link>
        </div>

        {mixTotal === 0 ? (
          <p className="muted-block section">No bookings recorded yet.</p>
        ) : (
          <div className="chart-bars section">
            <div
              className="chart-bars__track"
              role="img"
              aria-label={`Booking mix: ${mix
                .map((entry) => `${entry.label} ${entry.count}`)
                .join(", ")}`}
            >
              {mix
                .filter((entry) => entry.count > 0)
                .map((entry) => (
                  <span
                    key={entry.status}
                    className={`chart-bars__segment chart-bars__segment--${entry.modifier}`}
                    style={{ width: `${(entry.count / mixTotal) * 100}%` }}
                  />
                ))}
            </div>
            <div className="chart-legend">
              {mix.map((entry) => (
                <span className="chart-legend__item" key={entry.status}>
                  <span
                    className={`chart-legend__dot chart-legend__dot--${entry.modifier}`}
                    aria-hidden="true"
                  />
                  <span className="chart-legend__label">{entry.label}</span>
                  <span className="chart-legend__value">{entry.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="split section">
        <div className="stack stack--loose">
          <div className="card">
            <div className="card__header">
              <div>
                <p className="card__title">Next up</p>
                <p className="card__subtitle">The five soonest confirmed appointments.</p>
              </div>
              <Link className="btn btn--secondary btn--sm" to={PATHS.appointments}>
                Open calendar
              </Link>
            </div>
            <DataTable
              columns={appointmentColumns}
              rows={upcoming.slice(0, 5)}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              empty={
                <EmptyState
                  title="Nothing scheduled yet"
                  message="Bookings made by the AI receptionist appear here the moment they are confirmed."
                  icon={CalendarPlus}
                  action={
                    <Link className="btn btn--primary btn--sm" to={PATHS.appointments}>
                      Create an appointment
                    </Link>
                  }
                />
              }
            />
          </div>

          <div className="card">
            <div className="card__header">
              <div>
                <p className="card__title">Recent AI conversations</p>
                <p className="card__subtitle">
                  Every customer chat is stored with its transcript and detected intent.
                </p>
              </div>
              <Link className="btn btn--ghost btn--sm" to={PATHS.conversations}>
                View all
              </Link>
            </div>

            {conversationsQuery.isLoading ? (
              <LoadingBlock label="Loading conversations…" />
            ) : conversations.length === 0 ? (
              <EmptyState
                title="No conversations yet"
                message="Share your receptionist link to start collecting chats."
                icon={Sparkles}
              />
            ) : (
              <div className="record-list">
                {conversations.map((conversation: Conversation) => (
                  <div className="record-list__item" key={conversation.id}>
                    <div className="row row--between">
                      <span className="table-person__name">
                        {conversation.customer?.name ?? "Unidentified customer"}
                      </span>
                      <span className="text-xs text-muted">{formatRelative(conversation.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted">{excerpt(conversation.transcript, 120)}</p>
                    <div className="row row--wrap text-xs text-muted">
                      <span>{conversation.customer?.phone ?? "No phone captured"}</span>
                      <span>·</span>
                      <span>{conversation.intent ?? "No intent"}</span>
                      <span>·</span>
                      <span>{formatTime(conversation.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="stack stack--loose">
          <ChatLinkCard businessId={businessId} businessName={business?.name} />

          <div className="card card--padded">
            <p className="card__title">Today at a glance</p>
            <p className="card__subtitle">Confirmed work for the current day.</p>

            {today.length === 0 ? (
              <p className="muted-block section">No appointments scheduled for today.</p>
            ) : (
              <div className="stack section">
                {today.slice(0, 6).map((appointment) => (
                  <div className="record-list__row" key={appointment.id}>
                    <div>
                      <p className="table-person__name">
                        {appointment.customer?.name ?? "Unknown customer"}
                      </p>
                      <p className="table-person__meta">
                        {appointment.service?.name ?? "Service"} ·{" "}
                        {appointment.staff?.name ?? "Unassigned"}
                      </p>
                    </div>
                    <span className="text-sm nowrap">{formatTime(appointment.startTime)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card card--padded">
            <p className="card__title">Business details</p>
            {businessQuery.isLoading ? (
              <LoadingBlock label="Loading profile…" />
            ) : business ? (
              <div className="stack stack--tight section">
                <div className="row">
                  <UserRound size={15} aria-hidden="true" className="text-muted" />
                  <span className="text-sm">{business.name}</span>
                </div>
                <p className="text-sm text-muted">{business.industry}</p>
                {business.phone ? <p className="text-sm text-muted">{business.phone}</p> : null}
                {business.address ? <p className="text-sm text-muted">{business.address}</p> : null}
                <Link className="btn-link section" to={PATHS.businessProfile}>
                  Edit business profile
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted section">Profile unavailable.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
