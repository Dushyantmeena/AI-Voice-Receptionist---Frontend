import { useState } from "react";
import { Ban, CalendarCheck2, Check, Eye, UserX } from "lucide-react";
import type { Appointment, AppointmentStatus } from "@/types/domain";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { appointmentService } from "@/services/appointmentService";
import { getErrorMessage } from "@/api/apiError";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Pagination, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { EmptyState, ErrorState } from "@/components/ui/Feedback";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_OPTIONS } from "@/constants/domain";
import { formatCurrency, formatDateTimeRange, formatRelative, pluralize } from "@/utils/format";

const PAGE_LIMIT = 10;

interface StatusChange {
  appointment: Appointment;
  status: AppointmentStatus;
}

export default function StaffAppointmentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const staffId = user?.staffId ?? "";

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<AppointmentStatus | "">("");
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [pendingStatus, setPendingStatus] = useState<StatusChange | null>(null);

  const appointmentsQuery = useAsyncData(
    () =>
      appointmentService.listNewestFirst({
        page,
        limit: PAGE_LIMIT,
        ...(status ? { status } : {}),
      }),
    [page, status],
    { enabled: Boolean(staffId) },
  );

  const appointments = appointmentsQuery.data?.data ?? [];
  const meta = appointmentsQuery.data?.meta;

  const updateStatus = useAsyncAction(async ({ appointment, status: nextStatus }: StatusChange) =>
    appointmentService.update(appointment.id, { status: nextStatus }),
  );

  const requestStatusChange = (appointment: Appointment, nextStatus: AppointmentStatus) => {
    setPendingStatus({ appointment, status: nextStatus });
  };

  const handleStatusChange = async () => {
    if (!pendingStatus) return;
    try {
      const updated = await updateStatus.run(pendingStatus);
      toast.success(
        `Marked as ${APPOINTMENT_STATUS_LABELS[pendingStatus.status].toLowerCase()}`,
        `${pendingStatus.appointment.customer?.name ?? "The appointment"} · ${formatDateTimeRange(
          pendingStatus.appointment.startTime,
          pendingStatus.appointment.endTime,
        )}`,
      );
      setPendingStatus(null);
      setDetail((current) => (current && current.id === updated.id ? updated : current));
      appointmentsQuery.reload();
    } catch (error) {
      toast.error("Could not update the appointment", getErrorMessage(error));
      setPendingStatus(null);
    }
  };

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
          <p className="table-person__meta">
            {row.service
              ? `${row.service.durationMinutes} min · ${formatCurrency(row.service.price)}`
              : "Not linked"}
          </p>
        </div>
      ),
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
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            aria-label={`Open the appointment for ${row.customer?.name ?? "this customer"}`}
            onClick={() => setDetail(row)}
          >
            <Eye size={15} />
          </Button>
          {row.status === "BOOKED" ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Mark as completed"
                onClick={() => requestStatusChange(row, "COMPLETED")}
              >
                <Check size={15} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Mark as no show"
                onClick={() => requestStatusChange(row, "NO_SHOW")}
              >
                <UserX size={15} />
              </Button>
              <Button
                variant="danger-ghost"
                size="sm"
                iconOnly
                aria-label="Cancel this booking"
                onClick={() => requestStatusChange(row, "CANCELLED")}
              >
                <Ban size={15} />
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="My appointments"
        description="Only bookings assigned to you are returned by the API. Update the status after each visit so the front desk sees an accurate calendar."
      />

      <div className="card">
        <div className="toolbar">
          <Select
            className="toolbar__select"
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
          <p className="text-sm text-muted">{pluralize(meta?.total ?? 0, "appointment")}</p>
        </div>

        {appointmentsQuery.error ? (
          <ErrorState error={appointmentsQuery.error} onRetry={appointmentsQuery.reload} />
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={appointments}
              rowKey={(row) => row.id}
              caption="Appointments assigned to me"
              isLoading={appointmentsQuery.isLoading}
              empty={
                <EmptyState
                  icon={CalendarCheck2}
                  title={status ? `No ${APPOINTMENT_STATUS_LABELS[status].toLowerCase()} appointments` : "No appointments yet"}
                  message={
                    status
                      ? "Try another status filter to see the rest of your calendar."
                      : "Bookings made by the AI receptionist or the front desk appear here once they are assigned to you."
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
        Status changes are saved immediately. Rescheduling and permanent deletion stay with the front
        desk.
      </p>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.customer?.name ?? "Appointment"}
        description="Everything the AI receptionist recorded for this booking."
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Close
          </Button>
        }
      >
        {detail ? (
          <div className="stack">
            <div className="row row--wrap">
              <StatusBadge status={detail.status} />
              <Badge tone="neutral" dot={false}>
                {formatDateTimeRange(detail.startTime, detail.endTime)}
              </Badge>
              <Badge tone="neutral" dot={false}>
                {formatRelative(detail.startTime)}
              </Badge>
            </div>

            <div className="detail-list">
              <div className="detail-list__item">
                <p className="detail-list__label">Customer</p>
                <p className="detail-list__value">{detail.customer?.name ?? "Unknown customer"}</p>
              </div>
              <div className="detail-list__item">
                <p className="detail-list__label">Phone</p>
                <p className="detail-list__value">{detail.customer?.phone ?? "Not captured"}</p>
              </div>
              <div className="detail-list__item">
                <p className="detail-list__label">Email</p>
                <p className="detail-list__value">{detail.customer?.email ?? "Not captured"}</p>
              </div>
              <div className="detail-list__item">
                <p className="detail-list__label">Service</p>
                <p className="detail-list__value">{detail.service?.name ?? "Not linked"}</p>
              </div>
              <div className="detail-list__item">
                <p className="detail-list__label">Duration</p>
                <p className="detail-list__value">
                  {detail.service ? `${detail.service.durationMinutes} minutes` : "—"}
                </p>
              </div>
              <div className="detail-list__item">
                <p className="detail-list__label">Price</p>
                <p className="detail-list__value">
                  {detail.service ? formatCurrency(detail.service.price) : "—"}
                </p>
              </div>
            </div>

            {detail.notes ? (
              <p className="muted-block">{detail.notes}</p>
            ) : (
              <p className="text-sm text-muted">No notes were added to this booking.</p>
            )}

            {detail.status === "BOOKED" ? (
              <div className="detail-actions">
                <Button
                  size="sm"
                  leadingIcon={<Check size={15} />}
                  onClick={() => requestStatusChange(detail, "COMPLETED")}
                >
                  Mark completed
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={<UserX size={15} />}
                  onClick={() => requestStatusChange(detail, "NO_SHOW")}
                >
                  No show
                </Button>
                <Button
                  variant="danger-ghost"
                  size="sm"
                  leadingIcon={<Ban size={15} />}
                  onClick={() => requestStatusChange(detail, "CANCELLED")}
                >
                  Cancel booking
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        title={
          pendingStatus
            ? `Mark this appointment as ${APPOINTMENT_STATUS_LABELS[pendingStatus.status].toLowerCase()}?`
            : "Update the appointment?"
        }
        message={
          pendingStatus
            ? `${pendingStatus.appointment.customer?.name ?? "The customer"} on ${formatDateTimeRange(
                pendingStatus.appointment.startTime,
                pendingStatus.appointment.endTime,
              )}. The front desk sees the change immediately.`
            : ""
        }
        tone={pendingStatus?.status === "COMPLETED" ? "warning" : "danger"}
        confirmLabel="Save status"
        isConfirming={updateStatus.isPending}
        onConfirm={handleStatusChange}
        onCancel={() => setPendingStatus(null)}
      />
    </>
  );
}
