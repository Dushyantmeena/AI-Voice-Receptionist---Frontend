import { useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Plus, Search, Trash2 } from "lucide-react";
import type { Business } from "@/types/domain";
import { useToast } from "@/contexts/ToastContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { businessService } from "@/services/businessService";
import { getErrorMessage } from "@/api/apiError";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Pagination, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Modal";
import { PATHS } from "@/routes/paths";
import { formatDate, pluralize } from "@/utils/format";

const PAGE_LIMIT = 10;

export default function AdminBusinessesPage() {
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [pendingDelete, setPendingDelete] = useState<Business | null>(null);

  const businessesQuery = useAsyncData(
    () =>
      businessService.list({
        page,
        limit: PAGE_LIMIT,
        ...(debouncedSearch ? { name: debouncedSearch } : {}),
      }),
    [page, debouncedSearch],
  );

  const businesses = businessesQuery.data?.data ?? [];
  const meta = businessesQuery.data?.meta;

  const removeBusiness = useAsyncAction(async (business: Business) =>
    businessService.remove(business.id),
  );

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeBusiness.run(pendingDelete);
      toast.success("Business deleted", "The tenant and its platform records were removed.");
      setPendingDelete(null);
      businessesQuery.reload();
    } catch (error) {
      toast.error(
        "Could not delete the business",
        `${getErrorMessage(error)} Remove its appointments and conversations first.`,
      );
      setPendingDelete(null);
    }
  };

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
      id: "email",
      header: "Email",
      cell: (row) => row.email ?? <span className="text-muted">—</span>,
    },
    {
      id: "phone",
      header: "Phone",
      cell: (row) => row.phone ?? <span className="text-muted">—</span>,
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
        <div className="table-actions">
          <Link className="btn btn--ghost btn--sm" to={PATHS.adminBusiness(row.id)}>
            Manage
          </Link>
          <Button
            variant="danger-ghost"
            size="sm"
            iconOnly
            aria-label={`Delete ${row.name}`}
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
        title="Businesses"
        description="Every tenant on the platform. Opening a business shows its roster, services, calendar and conversations."
        actions={
          <Link className="btn btn--primary" to={PATHS.adminBusinessNew}>
            <Plus size={16} />
            Onboard a business
          </Link>
        }
      />

      <div className="card">
        <div className="toolbar">
          <div className="search-input search-input--grow">
            <Search size={16} />
            <input
              className="input"
              type="search"
              placeholder="Search by business name"
              aria-label="Search businesses by name"
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
            />
          </div>
          <p className="text-sm text-muted">{pluralize(meta?.total ?? 0, "business", "businesses")}</p>
        </div>

        {businessesQuery.error ? (
          <ErrorState error={businessesQuery.error} onRetry={businessesQuery.reload} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={businesses}
              rowKey={(row) => row.id}
              caption="Businesses"
              isLoading={businessesQuery.isLoading}
              empty={
                <EmptyState
                  icon={Building2}
                  title={debouncedSearch ? "No business matches that name" : "No businesses yet"}
                  message={
                    debouncedSearch
                      ? "Search runs on the backend — try a shorter name."
                      : "Onboarding creates the business and its first administrator login."
                  }
                  action={
                    debouncedSearch ? undefined : (
                      <Link className="btn btn--primary btn--sm" to={PATHS.adminBusinessNew}>
                        Onboard the first business
                      </Link>
                    )
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
                isDisabled={businessesQuery.isLoading}
              />
            ) : null}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this business?"
        message={
          pendingDelete
            ? `${pendingDelete.name} will be permanently removed. Staff, services and appointments must be cleared first — the backend rejects the deletion while they exist.`
            : ""
        }
        confirmLabel="Delete business"
        isConfirming={removeBusiness.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
