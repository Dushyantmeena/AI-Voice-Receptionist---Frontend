import { useMemo, useState } from "react";
import { MessagesSquare, Search, Sparkles, Trash2 } from "lucide-react";
import type { Conversation } from "@/types/domain";
import { useToast } from "@/contexts/ToastContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { conversationService } from "@/services/conversationService";
import { businessService } from "@/services/businessService";
import { getErrorMessage } from "@/api/apiError";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Pagination, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Field";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ConversationDetailModal } from "@/features/conversations/ConversationDetailModal";
import { excerpt, formatDateTime, formatRelative, pluralize } from "@/utils/format";

const PAGE_LIMIT = 10;

/**
 * Platform-wide conversation log.
 *
 * SuperAdmin bypasses tenant scoping, so the list spans every business; the
 * `businessId` filter is what narrows it back down to a single tenant.
 */
export default function AdminConversationsPage() {
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [businessFilter, setBusinessFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);

  const businessesQuery = useAsyncData(() => businessService.list({ page: 1, limit: 100 }), []);

  const conversationsQuery = useAsyncData(
    () =>
      conversationService.list({
        page,
        limit: PAGE_LIMIT,
        ...(businessFilter ? { businessId: businessFilter } : {}),
      }),
    [page, businessFilter],
  );

  const businesses = businessesQuery.data?.data ?? [];
  const meta = conversationsQuery.data?.meta;

  const businessNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const business of businessesQuery.data?.data ?? []) map.set(business.id, business.name);
    return map;
  }, [businessesQuery.data]);

  const rows = useMemo(() => {
    const loaded = conversationsQuery.data?.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return loaded;
    return loaded.filter((conversation) =>
      [
        conversation.customer?.name,
        conversation.customer?.phone,
        conversation.intent,
        conversation.transcript,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [conversationsQuery.data, search]);

  const removeConversation = useAsyncAction(async (conversation: Conversation) =>
    conversationService.remove(conversation.id),
  );

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeConversation.run(pendingDelete);
      toast.success("Conversation deleted", "The transcript has been removed permanently.");
      setPendingDelete(null);
      conversationsQuery.reload();
    } catch (error) {
      toast.error("Could not delete the conversation", getErrorMessage(error));
      setPendingDelete(null);
    }
  };

  const columns: DataTableColumn<Conversation>[] = [
    {
      id: "customer",
      header: "Customer",
      cell: (row) => (
        <div className="table-person__body">
          <p className="table-person__name">{row.customer?.name ?? "Unidentified customer"}</p>
          <p className="table-person__meta">{row.customer?.phone ?? "No phone captured"}</p>
        </div>
      ),
    },
    {
      id: "business",
      header: "Business",
      cell: (row) => (
        <div className="table-person__body">
          <p className="table-person__name">
            {row.business?.name ?? businessNameById.get(row.businessId) ?? "Unknown business"}
          </p>
          <p className="table-person__meta text-mono">{row.businessId}</p>
        </div>
      ),
    },
    {
      id: "intent",
      header: "Intent",
      cell: (row) =>
        row.intent ? (
          <Badge tone="brand" dot={false}>
            <Sparkles size={11} aria-hidden="true" />
            {row.intent}
          </Badge>
        ) : (
          <span className="text-sm text-muted">Not detected</span>
        ),
    },
    {
      id: "transcript",
      header: "Conversation",
      cell: (row) => <span className="text-sm text-secondary">{excerpt(row.transcript, 100)}</span>,
    },
    {
      id: "created",
      header: "Started",
      cell: (row) => (
        <div className="table-timestamp">
          <span>{formatDateTime(row.createdAt)}</span>
          <span className="table-timestamp__range">{formatRelative(row.createdAt)}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="table-actions">
          <Button variant="ghost" size="sm" onClick={() => setSelected(row)}>
            Read
          </Button>
          <Button
            variant="danger-ghost"
            size="sm"
            iconOnly
            aria-label="Delete conversation"
            onClick={() => setPendingDelete(row)}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Conversations"
        description="Every AI chat session across the platform — transcript, detected intent and the tools the receptionist executed."
      />

      <div className="card">
        <div className="toolbar">
          <div className="search-input search-input--grow">
            <Search size={16} />
            <input
              className="input"
              type="search"
              placeholder="Filter this page by customer or text"
              aria-label="Filter conversations on this page"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </div>
          <Select
            className="toolbar__select"
            aria-label="Filter conversations by business"
            value={businessFilter}
            onChange={(event) => {
              setBusinessFilter(event.currentTarget.value);
              setPage(1);
            }}
          >
            <option value="">All businesses</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </Select>
          <p className="text-sm text-muted nowrap">{pluralize(meta?.total ?? 0, "session")}</p>
        </div>

        {businessesQuery.error && businesses.length === 0 ? (
          <p className="text-sm text-muted section">
            The business list could not be loaded, so the tenant filter only offers “All businesses”.
          </p>
        ) : null}

        {conversationsQuery.error ? (
          <ErrorState error={conversationsQuery.error} onRetry={conversationsQuery.reload} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              caption="Conversations across all businesses"
              isLoading={conversationsQuery.isLoading}
              empty={
                <EmptyState
                  icon={MessagesSquare}
                  title={search ? "No match on this page" : "No conversations yet"}
                  message={
                    search
                      ? "Search only covers the sessions loaded on this page."
                      : businessFilter
                        ? "This business has not received any customer chats yet."
                        : "Sessions appear here as soon as a customer opens a business chat link."
                  }
                />
              }
            />
            {meta ? (
              <Pagination
                page={meta.page}
                totalPages={meta.totalPages}
                total={meta.total}
                onPageChange={setPage}
                isDisabled={conversationsQuery.isLoading}
              />
            ) : null}
          </>
        )}
      </div>

      <ConversationDetailModal conversation={selected} onClose={() => setSelected(null)} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this conversation?"
        message="The transcript and its tool history will be permanently removed. Appointments created during the session are not affected."
        confirmLabel="Delete transcript"
        isConfirming={removeConversation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
