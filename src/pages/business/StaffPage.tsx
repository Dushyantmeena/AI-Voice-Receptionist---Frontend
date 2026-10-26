import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, Pencil, Trash2, UserPlus } from "lucide-react";
import type { Staff } from "@/types/domain";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { staffService } from "@/services/staffService";
import { serviceCatalogService } from "@/services/serviceCatalogService";
import { getErrorMessage } from "@/api/apiError";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert, EmptyState, ErrorState } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Modal";
import { StaffFormModal } from "@/features/staff/StaffFormModal";
import { PATHS } from "@/routes/paths";

export default function StaffPage() {
  const { user } = useAuth();
  const toast = useToast();
  const businessId = user?.businessId ?? "";

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Staff | null>(null);

  const staffQuery = useAsyncData(() => staffService.list({ page: 1, limit: 100 }), [businessId], {
    enabled: Boolean(businessId),
  });
  const servicesQuery = useAsyncData(
    () => serviceCatalogService.list({ page: 1, limit: 100 }),
    [businessId],
    { enabled: Boolean(businessId) },
  );

  const staff = staffQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];
  const serviceNameById = new Map(services.map((service) => [service.id, service.name]));

  const removeStaff = useAsyncAction(async (member: Staff) => staffService.remove(member.id));

  const handleSaved = () => {
    toast.success(editing ? "Team member updated" : "Team member added");
    setFormOpen(false);
    setEditing(null);
    staffQuery.reload();
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeStaff.run(pendingDelete);
      toast.success("Team member removed");
      setPendingDelete(null);
      staffQuery.reload();
    } catch (error) {
      toast.error(
        "Could not remove team member",
        `${getErrorMessage(error)} Bookings referencing this person must be reassigned or deleted first.`,
      );
      setPendingDelete(null);
    }
  };

  const columns: DataTableColumn<Staff>[] = [
    {
      id: "name",
      header: "Team member",
      cell: (row) => (
        <div className="table-person">
          <span className="avatar avatar--sm" aria-hidden="true">
            {row.name.charAt(0).toUpperCase()}
          </span>
          <div className="table-person__body">
            <p className="table-person__name">{row.name}</p>
            <p className="table-person__meta">{row.role}</p>
          </div>
        </div>
      ),
    },
    {
      id: "services",
      header: "Services",
      cell: (row) => {
        const names = (row.services ?? [])
          .map((link) => serviceNameById.get(link.serviceId) ?? link.service?.name)
          .filter((name): name is string => Boolean(name));

        if (names.length === 0) {
          return <span className="text-sm text-muted">None linked</span>;
        }

        return (
          <div className="inline-list">
            {names.slice(0, 3).map((name) => (
              <Badge tone="neutral" dot={false} key={name}>
                {name}
              </Badge>
            ))}
            {names.length > 3 ? <Badge tone="neutral" dot={false}>+{names.length - 3}</Badge> : null}
          </div>
        );
      },
    },
    {
      id: "hours",
      header: "Weekly hours",
      cell: (row) => {
        const count = row.availabilities?.length ?? 0;
        return count === 0 ? (
          <Badge tone="warning">Not set</Badge>
        ) : (
          <span className="text-sm">{count} window{count === 1 ? "" : "s"}</span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: (row) =>
        row.isActive ? (
          <Badge tone="success">Available</Badge>
        ) : (
          <Badge tone="neutral">Inactive</Badge>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="table-actions">
          <Link
            className="btn btn--ghost btn--sm btn--icon"
            to={`${PATHS.availability}?staffId=${encodeURIComponent(row.id)}`}
            aria-label={`Manage hours for ${row.name}`}
            title="Manage weekly hours"
          >
            <CalendarClock size={15} />
          </Link>
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
            aria-label={`Remove ${row.name}`}
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
        title="Staff"
        description="The roster the AI receptionist can offer. Only people marked available and linked to a service are proposed to customers."
        actions={
          <Button
            leadingIcon={<UserPlus size={16} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add team member
          </Button>
        }
      />

      <Alert tone="info" title="Service links are set when a person is created">
        The backend exposes no endpoint for editing the staff↔service links, so the assignment is fixed
        at creation. Profiles, roles and availability can be changed at any time.
      </Alert>

      <div className="card section">
        {staffQuery.error ? (
          <ErrorState error={staffQuery.error} onRetry={staffQuery.reload} />
        ) : (
          <DataTable
            columns={columns}
            rows={staff}
            rowKey={(row) => row.id}
            caption="Team members"
            isLoading={staffQuery.isLoading}
            empty={
              <EmptyState
                title="No team members yet"
                message="Add the people who deliver your services so the receptionist can match bookings to them."
                action={
                  <Button size="sm" leadingIcon={<UserPlus size={15} />} onClick={() => setFormOpen(true)}>
                    Add the first team member
                  </Button>
                }
              />
            }
          />
        )}
      </div>

      <StaffFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        businessId={businessId}
        staffMember={editing}
        services={services}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Remove this team member?"
        message={
          pendingDelete
            ? `${pendingDelete.name} will be removed from the roster. Existing appointments reference this person, so the backend will refuse while bookings still exist.`
            : ""
        }
        confirmLabel="Remove"
        isConfirming={removeStaff.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
