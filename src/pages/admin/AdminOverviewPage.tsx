import { Link } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  MessagesSquare,
  Plus,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useAsyncData } from "@/hooks/useAsyncData";
import { businessService } from "@/services/businessService";
import { conversationService } from "@/services/conversationService";
import { appointmentService } from "@/services/appointmentService";
import { PageHeader, StatCard } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { PATHS } from "@/routes/paths";
import { excerpt, formatDate, formatRelative, formatNumber } from "@/utils/format";
import type { Business, Conversation } from "@/types/domain";

export default function AdminOverviewPage() {
  const businessesQuery = useAsyncData(() => businessService.list({ page: 1, limit: 6 }), []);
  const conversationsQuery = useAsyncData(() => conversationService.list({ page: 1, limit: 6 }), []);
  // A single-row page is the cheapest way to read the platform-wide total.
  const appointmentsQuery = useAsyncData(() => appointmentService.list({ page: 1, limit: 1 }), []);

  const businesses = businessesQuery.data?.data ?? [];
  const businessTotal = businessesQuery.data?.meta.total ?? 0;
  const conversations = conversationsQuery.data?.data ?? [];
  const conversationTotal = conversationsQuery.data?.meta.total ?? 0;
  const appointmentTotal = appointmentsQuery.data?.meta.total ?? 0;

  const errors = [businessesQuery.error, conversationsQuery.error, appointmentsQuery.error].filter(
    (error): error is NonNullable<typeof error> => Boolean(error),
  );

  const industries = new Set(businesses.map((business) => business.industry.trim().toLowerCase()));

  const columns: DataTableColumn<Business>[] = [
    {
      id: "name",
      header: "Business",
      cell: (row) => (
        <div className="table-person">
          <span className="avatar avatar--sm" aria-hidden="true">
            {row.name.charAt(0).toUpperCase()}
          </span>
          <div className="table-person__body">
            <p className="table-person__name">{row.name}</p>
            <p className="table-person__meta">{row.id}</p>
          </div>
        </div>
      ),
    },
    {
      id: "industry",
      header: "Industry",
      cell: (row) => <Badge tone="neutral" dot={false}>{row.industry}</Badge>,
    },
    {
      id: "contact",
      header: "Contact",
      cell: (row) => (
        <div className="table-person__body">
          <p className="table-person__name">{row.email ?? "No email"}</p>
          <p className="table-person__meta">{row.phone ?? "No phone"}</p>
        </div>
      ),
    },
    {
      id: "created",
      header: "Onboarded",
      cell: (row) => formatDate(row.createdAt),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <Link className="btn btn--ghost btn--sm" to={PATHS.adminBusiness(row.id)}>
          Open
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Platform"
        title="Platform overview"
        description="Every business, conversation and appointment on the platform, served by the same backend the AI receptionist uses."
        actions={
          <Link className="btn btn--primary" to={PATHS.adminBusinessNew}>
            <Plus size={16} />
            Onboard a business
          </Link>
        }
      />

      {errors.length > 0 ? (
        <div className="stack section">
          {errors.map((error, index) => (
            <ErrorState
              key={`${error.kind}-${index}`}
              error={error}
              onRetry={() => {
                businessesQuery.reload();
                conversationsQuery.reload();
                appointmentsQuery.reload();
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="stat-grid">
        <StatCard
          label="Businesses"
          value={formatNumber(businessTotal)}
          icon={Building2}
          meta={`${industries.size} industries in view`}
        />
        <StatCard
          label="AI conversations"
          value={formatNumber(conversationTotal)}
          icon={MessagesSquare}
          tone="info"
          meta={conversations[0] ? `Latest ${formatRelative(conversations[0].createdAt)}` : "No sessions yet"}
        />
        <StatCard
          label="Appointments"
          value={formatNumber(appointmentTotal)}
          icon={CalendarDays}
          tone="success"
          meta="Across every business"
        />
        <StatCard
          label="Access model"
          value="3 roles"
          icon={TrendingUp}
          tone="warning"
          meta="Super Admin · Business Admin · Staff"
        />
      </div>

      <div className="split section">
        <div className="card">
          <div className="card__header">
            <div>
              <p className="card__title">Recently onboarded</p>
              <p className="card__subtitle">The newest businesses on the platform.</p>
            </div>
            <Link className="btn btn--secondary btn--sm" to={PATHS.adminBusinesses}>
              View all
            </Link>
          </div>

          <DataTable
            columns={columns}
            rows={businesses}
            rowKey={(row) => row.id}
            caption="Recent businesses"
            isLoading={businessesQuery.isLoading}
            empty={
              <EmptyState
                title="No businesses yet"
                message="Onboarding a business also creates its first Business Admin login."
                action={
                  <Link className="btn btn--primary btn--sm" to={PATHS.adminBusinessNew}>
                    Onboard the first business
                  </Link>
                }
              />
            }
          />
        </div>

        <div className="card">
          <div className="card__header">
            <div>
              <p className="card__title">Latest conversations</p>
              <p className="card__subtitle">Across every tenant.</p>
            </div>
            <Link className="btn btn--ghost btn--sm" to={PATHS.adminConversations}>
              View all
            </Link>
          </div>

          {conversationsQuery.isLoading ? (
            <div className="record-list">
              <div className="record-list__item skeleton skeleton--row" />
              <div className="record-list__item skeleton skeleton--row" />
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="No conversations yet"
              message="Sessions appear here once customers start chatting with a business."
            />
          ) : (
            <div className="record-list">
              {conversations.map((conversation: Conversation) => (
                <div className="record-list__item" key={conversation.id}>
                  <div className="row row--between">
                    <span className="table-person__name">
                      {conversation.business?.name ?? "Unknown business"}
                    </span>
                    <span className="text-xs text-muted">{formatRelative(conversation.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted">{excerpt(conversation.transcript, 110)}</p>
                  <div className="row row--wrap text-xs text-muted">
                    <span>{conversation.customer?.name ?? "Unidentified customer"}</span>
                    <span>·</span>
                    <span>{conversation.intent ?? "No intent"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card card--padded section">
        <div className="row row--between row--wrap">
          <div>
            <p className="card__title">Need to give someone access?</p>
            <p className="card__subtitle">
              Business Admin logins are created with the business itself; Staff logins are provisioned
              from the roster.
            </p>
          </div>
          <Link className="btn btn--secondary" to={PATHS.adminAccess}>
            Open user access
          </Link>
        </div>
      </div>
    </>
  );
}
