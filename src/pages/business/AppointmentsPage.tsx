import { useMemo, useState } from "react";
import { CalendarPlus, Check, Pencil, Search, Trash2 } from "lucide-react";
import type { Appointment, AppointmentStatus } from "@/types/domain";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { appointmentService } from "@/services/appointmentService";
import { customerService } from "@/services/customerService";
import { staffService } from "@/services/staffService";
import { serviceCatalogService } from "@/services/serviceCatalogService";
import { getErrorMessage } from "@/api/apiError";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Pagination, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { StatusBadge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Modal";
import { AppointmentFormModal } from "@/features/appointments/AppointmentFormModal";
import { APPOINTMENT_STATUS_OPTIONS } from "@/constants/domain";
import { formatDateTimeRange, formatRelative, pluralize } from "@/utils/format";

const PAGE_LIMIT = 10;

export default function AppointmentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const businessId = user?.businessId ?? "";

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AppointmentStatus | "">("");
  const [staffFilter, setStaffFilter] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Appointment | null>(null);

  const appointmentsQuery = useAsyncData(
    () =>
      appointmentService.listNewestFirst({
        page,
        limit: PAGE_LIMIT,
        businessId,
        ...(status ? { status } : {}),
        ...(staffFilter ? { staffId: staffFilter } : {}),
      }),
    [page, status, staffFilter, businessId],
    { enabled: Boolean(businessId) },
  );

  const staffQuery = useAsyncData(() => staffService.list({ page: 1, limit: 50 }), [businessId], {
    enabled: Boolean(businessId),
  });
  const servicesQuery = useAsyncData(
    () => serviceCatalogService.list({ page: 1, limit: 50 }),
    [businessId],
    { enabled: Boolean(businessId) },
  );
  const customersQuery = useAsyncData(
    () => customerService.list({ page: 1, limit: 100 }),
    [businessId],
    { enabled: Boolean(businessId) },
  );

  const appointments = appointmentsQuery.data?.data ?? [];
  const meta = appointmentsQuery.data?.meta;
  const staff = staffQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];
  const customers = customersQuery.data?.data ?? [];

  const rows = useMemo(() => {
    const loaded = appointmentsQuery.data?.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return loaded;
    return loaded.filter((appointment) => {
      const haystack = [
        appointment.customer?.name,
        appointment.customer?.phone,
        appointment.service?.name,
        appointment.staff?.name,
        appointment.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [appointmentsQuery.data, search]);

  const removeAppointment = useAsyncAction(async (appointment: Appointment) =>
    appointmentService.remove(appointment.id),
  );

  const completeAppointment = useAsyncAction(async (appointment: Appointment) =>
    appointmentService.update(appointment.id, { status: "COMPLETED" }),
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (appointment: Appointment) => {
    setEditing(appointment);
    setFormOpen(true);
  };

  const handleSaved = () => {
    setFormOpen(false);
    setEditing(null);
    toast.success(editing ? "Appointment updated" : "Appointment created");
    appointmentsQuery.reload();
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await removeAppointment.run(pendingDelete);
      toast.success("Appointment deleted", "The record was removed from the calendar.");
      setPendingDelete(null);
      appointmentsQuery.reload();
    } catch (error) {
      toast.error("Could not delete appointment", getErrorMessage(error));
      setPendingDelete(null);
    }
  };

  const handleComplete = async (appointment: Appointment) => {
    try {
      await completeAppointment.run(appointment);
      toast.success("Marked as completed");
      appointmentsQuery.reload();
    } catch (error) {
      toast.error("Could not update status", getErrorMessage(error));
    }
  };

  if (!businessId) {
    return (
      <EmptyState
        title="No business linked"
        message="This administrator account is not attached to a business, so the calendar cannot be loaded."
      />
    );
  }

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
          <p className="table-person__meta">{row.customer?.phone ?? "No phone"}</p>
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
            {row.service ? `${row.service.durationMinutes} min` : "Not linked"}
          </p>
        </div>
      ),
    },
    {
      id: "staff",
      header: "Team member",
      cell: (row) => row.staff?.name ?? "—",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="table-actions">
          {row.status === "BOOKED" ? (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label={`Mark the appointment for ${row.customer?.name ?? "customer"} as completed`}
              onClick={() => handleComplete(row)}
              disabled={completeAppointment.isPending}
            >
              <Check size={15} />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label="Edit appointment"
            onClick={() => openEdit(row)}
          >
            <Pencil size={15} />
          </Button>
          <Button
            variant="danger-ghost"
            size="sm"
            iconOnly
            aria-label="Delete appointment"
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
        title="Appointments"
        description="The same calendar the AI receptionist books into. Manual entries are recorded immediately — the backend does not block overlapping slots for staff-created bookings."
        actions={
          <Button leadingIcon={<CalendarPlus size={16} />} onClick={openCreate}>
            New appointment
          </Button>
        }
      />

      <div className="card">
        <div className="toolbar">
          <div className="search-input search-input--grow">
            <Search size={16} />
            <input
              className="input"
              type="search"
              placeholder="Filter this page by customer, phone or service"
              aria-label="Filter appointments on this page"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </div>

          <Field htmlFor="appointment-status-filter" className="toolbar__select">
            <Select
              id="appointment-status-filter"
              aria-label="Filter by status"
              value={status}
              onChange={(event) => {
                setStatus(event.currentTarget.value as AppointmentStatus | "");
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              {APPOINTMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field htmlFor="appointment-staff-filter" className="toolbar__select">
            <Select
              id="appointment-staff-filter"
              aria-label="Filter by team member"
              value={staffFilter}
              onChange={(event) => {
                setStaffFilter(event.currentTarget.value);
                setPage(1);
              }}
            >
              <option value="">All team members</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {appointmentsQuery.error ? (
          <ErrorState error={appointmentsQuery.error} onRetry={appointmentsQuery.reload} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.id}
              caption="Appointments"
              isLoading={appointmentsQuery.isLoading}
              empty={
                <EmptyState
                  title={search ? "No match on this page" : "No appointments yet"}
                  message={
                    search
                      ? "The search only filters the appointments loaded on this page. Clear it or move to another page."
                      : "Bookings from the AI receptionist and manual entries will appear here."
                  }
                  action={
                    search ? undefined : (
                      <Button size="sm" leadingIcon={<CalendarPlus size={15} />} onClick={openCreate}>
                        Create the first appointment
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
                isDisabled={appointmentsQuery.isLoading}
              />
            ) : null}
          </>
        )}
      </div>

      <p className="text-xs text-muted section">
        {pluralize(meta?.total ?? 0, "appointment")} in total ·{" "}
        {staff.length} team members · {services.length} services available for booking.
      </p>

      <AppointmentFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        businessId={businessId}
        appointment={editing}
        customers={customers}
        staff={staff}
        services={services}
        existing={appointments}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this appointment?"
        message={
          pendingDelete
            ? `${pendingDelete.customer?.name ?? "This customer"}'s booking on ${formatDateTimeRange(
                pendingDelete.startTime,
                pendingDelete.endTime,
              )} will be permanently removed. To keep a record, edit the status to Cancelled instead.`
            : ""
        }
        confirmLabel="Delete permanently"
        isConfirming={removeAppointment.isPending}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
