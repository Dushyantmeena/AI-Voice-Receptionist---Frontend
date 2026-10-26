import { useMemo, useState } from "react";
import { MessagesSquare, Search, Sparkles, Trash2 } from "lucide-react";
import type { Conversation } from "@/types/domain";
import { useToast } from "@/contexts/ToastContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { conversationService } from "@/services/conversationService";
import { getErrorMessage } from "@/api/apiError";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Pagination, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ConversationDetailModal } from "@/features/conversations/ConversationDetailModal";
import { excerpt, formatDateTime, formatRelative, pluralize } from "@/utils/format";

const PAGE_LIMIT = 10;

export default function ConversationsPage() {
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);

  const conversationsQuery = useAsyncData(
    () => conversationService.list({ page, limit: PAGE_LIMIT }),
    [page],
  );

  const meta = conversationsQuery.data?.meta;

  const rows = useMemo(() => {
    const loaded = conversationsQuery.data?.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return loaded;
    return loaded.filter((conversation) =>
      [
        conversation.customer?.name,
        conversation.customer?.phone,
        conversation.transcript,
        conversation.intent,
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
      toast.error("Could not delete conversation", getErrorMessage(error));
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
      cell: (row) => <span className="text-sm text-secondary">{excerpt(row.transcript, 110)}</span>,
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
        title="AI conversations"
        description="Every customer chat handled by the receptionist, with the transcript, the detected intent and the tools it executed."
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
          <p className="text-sm text-muted">{pluralize(meta?.total ?? 0, "session")}</p>
        </div>

        {conversationsQuery.error ? (
          <ErrorState error={conversationsQuery.error} onRetry={conversationsQuery.reload} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              caption="AI conversations"
              isLoading={conversationsQuery.isLoading}
              empty={
                <EmptyState
                  icon={MessagesSquare}
                  title={search ? "No match on this page" : "No conversations yet"}
                  message={
                    search
                      ? "Search only covers the sessions loaded on this page."
                      : "Sessions appear here as soon as a customer talks to your receptionist."
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
        message="The transcript will be permanently removed. The appointments created during the session are not affected."
        confirmLabel="Delete transcript"
        isConfirming={removeConversation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
