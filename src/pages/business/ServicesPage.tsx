import { useState } from "react";
import { Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import type { Service } from "@/types/domain";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { serviceCatalogService } from "@/services/serviceCatalogService";
import { getErrorMessage } from "@/api/apiError";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ServiceFormModal } from "@/features/services/ServiceFormModal";
import { CURRENCY_CODE, formatCurrency } from "@/utils/format";

export default function ServicesPage() {
  const { user } = useAuth();
  const toast = useToast();
  const businessId = user?.businessId ?? "";

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Service | null>(null);

  const servicesQuery = useAsyncData(
    () => serviceCatalogService.list({ page: 1, limit: 100 }),
    [businessId],
    { enabled: Boolean(businessId) },
  );

  const services = servicesQuery.data?.data ?? [];
  const activeCount = services.filter((service) => service.isActive).length;

  const removeService = useAsyncAction(async (service: Service) =>
    serviceCatalogService.remove(service.id),
  );
  const toggleService = useAsyncAction(async (service: Service) =>
    serviceCatalogService.update(service.id, { isActive: !service.isActive }),
  );

  const handleSaved = () => {
    toast.success(editing ? "Service updated" : "Service created");
    setFormOpen(false);
    setEditing(null);
    servicesQuery.reload();
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeService.run(pendingDelete);
      toast.success("Service deleted");
      setPendingDelete(null);
      servicesQuery.reload();
    } catch (error) {
      toast.error(
        "Could not delete service",
        `${getErrorMessage(error)} Deactivate it instead to keep existing bookings intact.`,
      );
      setPendingDelete(null);
    }
  };

  const handleToggle = async (service: Service) => {
    try {
      await toggleService.run(service);
      toast.success(service.isActive ? "Service hidden from the agent" : "Service is live again");
      servicesQuery.reload();
    } catch (error) {
      toast.error("Could not update the service", getErrorMessage(error));
    }
  };

  const columns: DataTableColumn<Service>[] = [
    {
      id: "name",
      header: "Service",
      cell: (row) => (
        <div className="table-person__body">
          <p className="table-person__name">{row.name}</p>
          <p className="table-person__meta">{row.description ?? "No description"}</p>
        </div>
      ),
    },
    {
      id: "duration",
      header: "Duration",
      cell: (row) => <span className="nowrap">{row.durationMinutes} min</span>,
    },
    {
      id: "price",
      header: `Price (${CURRENCY_CODE})`,
      align: "right",
      cell: (row) => <span className="nowrap">{formatCurrency(row.price)}</span>,
    },
    {
      id: "status",
      header: "Visible to AI",
      cell: (row) =>
        row.isActive ? (
          <Badge tone="success">Live</Badge>
        ) : (
          <Badge tone="neutral">Hidden</Badge>
        ),
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
            onClick={() => handleToggle(row)}
            disabled={toggleService.isPending}
          >
            {row.isActive ? "Hide" : "Publish"}
          </Button>
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
        title="Services"
        description="What the receptionist quotes, how long it books and what it charges. Hidden services stay in the database for existing appointments but are never offered."
        actions={
          <Button
            leadingIcon={<Plus size={16} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New service
          </Button>
        }
      />

      <div className="row row--between row--wrap section" style={{ marginBottom: "12px" }}>
        <p className="text-sm text-muted">
          {services.length === 0
            ? "No services yet."
            : `${activeCount} of ${services.length} services are offered to customers.`}
        </p>
      </div>

      <div className="card">
        {servicesQuery.error ? (
          <ErrorState error={servicesQuery.error} onRetry={servicesQuery.reload} />
        ) : (
          <DataTable
            columns={columns}
            rows={services}
            rowKey={(row) => row.id}
            caption="Service catalogue"
            isLoading={servicesQuery.isLoading}
            empty={
              <EmptyState
                icon={Scissors}
                title="No services in the catalogue"
                message="The AI receptionist can only answer questions about services that exist here."
                action={
                  <Button
                    size="sm"
                    leadingIcon={<Plus size={15} />}
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    Create the first service
                  </Button>
                }
              />
            }
          />
        )}
      </div>

      <ServiceFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        businessId={businessId}
        service={editing}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this service?"
        message={
          pendingDelete
            ? `${pendingDelete.name} will be permanently removed. The backend rejects the deletion while appointments reference it — hide the service instead to keep the history.`
            : ""
        }
        confirmLabel="Delete service"
        isConfirming={removeService.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
