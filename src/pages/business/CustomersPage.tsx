import { useState } from "react";
import { Contact, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Customer } from "@/types/domain";
import { useToast } from "@/contexts/ToastContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { customerService } from "@/services/customerService";
import { getErrorMessage } from "@/api/apiError";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Pagination, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Alert, EmptyState, ErrorState } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Modal";
import { CustomerFormModal } from "@/features/customers/CustomerFormModal";
import { formatDate, pluralize } from "@/utils/format";

const PAGE_LIMIT = 10;

export default function CustomersPage() {
  const toast = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null);

  const customersQuery = useAsyncData(
    () =>
      customerService.list({
        page,
        limit: PAGE_LIMIT,
        ...(debouncedSearch ? { name: debouncedSearch } : {}),
      }),
    [page, debouncedSearch],
  );

  const customers = customersQuery.data?.data ?? [];
  const meta = customersQuery.data?.meta;

  const removeCustomer = useAsyncAction(async (customer: Customer) =>
    customerService.remove(customer.id),
  );

  const handleSaved = () => {
    toast.success(editing ? "Customer updated" : "Customer created");
    setFormOpen(false);
    setEditing(null);
    customersQuery.reload();
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeCustomer.run(pendingDelete);
      toast.success("Customer deleted");
      setPendingDelete(null);
      customersQuery.reload();
    } catch (error) {
      toast.error(
        "Could not delete customer",
        `${getErrorMessage(error)} Appointments or conversations still reference this record.`,
      );
      setPendingDelete(null);
    }
  };

  const columns: DataTableColumn<Customer>[] = [
    {
      id: "name",
      header: "Customer",
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
      id: "phone",
      header: "Phone",
      cell: (row) => <span className="nowrap">{row.phone}</span>,
    },
    {
      id: "email",
      header: "Email",
      cell: (row) => row.email ?? <span className="text-muted">—</span>,
    },
    {
      id: "created",
      header: "Added",
      cell: (row) => formatDate(row.createdAt),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="table-actions">
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={`Edit ${row.name}`}
            onClick={() => {
              setEditing(row);
              setFormOpen(true);
            }}
          >
            <Pencil size={15} />
          </Button>
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
        title="Customers"
        description="Everyone the AI receptionist has registered, plus customers added manually."
        actions={
          <Button
            leadingIcon={<Plus size={16} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New customer
          </Button>
        }
      />

      <Alert tone="info" title="Platform-wide records">
        The backend stores customers without a business column, so this list is not isolated per tenant.
        Appointments and conversations are still tenant-scoped, and only records linked to your business
        appear in your calendar and transcripts.
      </Alert>

      <div className="card section">
        <div className="toolbar">
          <div className="search-input search-input--grow">
            <Search size={16} />
            <input
              className="input"
              type="search"
              placeholder="Search by customer name"
              aria-label="Search customers by name"
              value={search}
              onChange={(event) => {
                setSearch(event.currentTarget.value);
                setPage(1);
              }}
            />
          </div>
          <p className="text-sm text-muted">{pluralize(meta?.total ?? 0, "customer")}</p>
        </div>

        {customersQuery.error ? (
          <ErrorState error={customersQuery.error} onRetry={customersQuery.reload} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={customers}
              rowKey={(row) => row.id}
              caption="Customers"
              isLoading={customersQuery.isLoading}
              empty={
                <EmptyState
                  icon={Contact}
                  title={debouncedSearch ? "No customer matches that name" : "No customers yet"}
                  message={
                    debouncedSearch
                      ? "Try a shorter search term or clear the field."
                      : "The receptionist creates a customer the first time someone books."
                  }
                  action={
                    debouncedSearch ? undefined : (
                      <Button
                        size="sm"
                        leadingIcon={<Plus size={15} />}
                        onClick={() => setFormOpen(true)}
                      >
                        Add a customer
                      </Button>
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
                isDisabled={customersQuery.isLoading}
              />
            ) : null}
          </>
        )}
      </div>

      <CustomerFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        customer={editing}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this customer?"
        message={
          pendingDelete
            ? `${pendingDelete.name} (${pendingDelete.phone}) will be permanently deleted. The backend refuses when appointments or conversations reference the record.`
            : ""
        }
        confirmLabel="Delete customer"
        isConfirming={removeCustomer.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
