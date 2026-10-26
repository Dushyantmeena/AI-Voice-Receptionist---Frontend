import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, CalendarPlus } from "lucide-react";
import type { Appointment, AppointmentStatus, Customer, Service, Staff } from "@/types/domain";
import { appointmentService } from "@/services/appointmentService";
import { getErrorMessage } from "@/api/apiError";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { APPOINTMENT_STATUS_OPTIONS } from "@/constants/domain";
import { addMinutes, fromDateTimeInput, toDateTimeInput } from "@/utils/date";
import { formatDateTimeRange, formatTime } from "@/utils/format";
import { useAsyncAction } from "@/hooks/useAsyncAction";

const appointmentSchema = z
  .object({
    customerId: z.string().min(1, "Choose a customer"),
    serviceId: z.string().min(1, "Choose a service"),
    staffId: z.string().min(1, "Choose a team member"),
    startTime: z.string().min(1, "Choose a start date and time"),
    status: z.enum(["BOOKED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
    notes: z.string().max(2000, "Notes are limited to 2000 characters").optional(),
  })
  .refine(
    (values) => {
      if (!values.serviceId || !values.startTime) return true;
      return Boolean(fromDateTimeInput(values.startTime));
    },
    { message: "Enter a valid date and time", path: ["startTime"] },
  );

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface AppointmentFormModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  /** Existing appointment to edit; `null` creates a new one. */
  appointment: Appointment | null;
  customers: Customer[];
  staff: Staff[];
  services: Service[];
  /** Currently loaded appointments, used for a client-side overlap warning. */
  existing: Appointment[];
  onSaved: (appointment: Appointment) => void;
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

export function AppointmentFormModal({
  open,
  onClose,
  businessId,
  appointment,
  customers,
  staff,
  services,
  existing,
  onSaved,
}: AppointmentFormModalProps) {
  const isEditing = Boolean(appointment);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      customerId: "",
      serviceId: "",
      staffId: "",
      startTime: "",
      status: "BOOKED",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;

    reset({
      customerId: appointment?.customerId ?? "",
      serviceId: appointment?.serviceId ?? "",
      staffId: appointment?.staffId ?? "",
      startTime: toDateTimeInput(appointment?.startTime),
      status: appointment?.status ?? "BOOKED",
      notes: appointment?.notes ?? "",
    });
  }, [appointment, open, reset]);

  const serviceId = watch("serviceId");
  const staffId = watch("staffId");
  const startTime = watch("startTime");

  const activeServices = useMemo(
    () => services.filter((service) => service.isActive || service.id === appointment?.serviceId),
    [services, appointment?.serviceId],
  );

  const activeStaff = useMemo(
    () => staff.filter((member) => member.isActive || member.id === appointment?.staffId),
    [staff, appointment?.staffId],
  );

  const service = activeServices.find((item) => item.id === serviceId) ?? null;

  // Only team members linked to the service can take the booking, matching the
  // rule the AI receptionist applies. If nobody is linked yet, the whole roster
  // stays selectable so the admin is never blocked.
  const linkedStaff = useMemo(() => {
    if (!serviceId) return [];
    return activeStaff.filter((member) =>
      (member.services ?? []).some((link) => link.serviceId === serviceId),
    );
  }, [activeStaff, serviceId]);

  const staffOptions = linkedStaff.length > 0 ? linkedStaff : activeStaff;

  const startIso = startTime ? fromDateTimeInput(startTime) : "";
  const endIso = startIso && service ? addMinutes(startIso, service.durationMinutes) : "";

  const conflict = useMemo(() => {
    if (!staffId || !startIso || !endIso) return null;
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;

    return (
      existing.find(
        (item) =>
          item.id !== appointment?.id &&
          item.staffId === staffId &&
          item.status === "BOOKED" &&
          overlaps(startMs, endMs, new Date(item.startTime).getTime(), new Date(item.endTime).getTime()),
      ) ?? null
    );
  }, [appointment?.id, endIso, existing, staffId, startIso]);

  const save = useAsyncAction(async (values: AppointmentFormValues) => {
    const start = fromDateTimeInput(values.startTime);
    const duration = service?.durationMinutes ?? 30;
    const payloadStatus = values.status as AppointmentStatus;

    const body = {
      businessId,
      customerId: values.customerId,
      staffId: values.staffId,
      serviceId: values.serviceId,
      startTime: start,
      endTime: addMinutes(start, duration),
      status: payloadStatus,
      notes: values.notes?.trim() ? values.notes.trim() : null,
    };

    const saved = appointment
      ? await appointmentService.update(appointment.id, body)
      : await appointmentService.create(body);

    return saved;
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const saved = await save.run(values);
      onSaved(saved);
    } catch {
      // `save.error` carries the normalised API error for the alert below.
    }
  });

  return (
    <Modal
      open={open}
      onClose={save.isPending ? () => undefined : onClose}
      size="lg"
      title={isEditing ? "Edit appointment" : "New appointment"}
      description={
        isEditing
          ? "Changes are written straight to the calendar the AI receptionist uses."
          : "Record a booking that arrived by phone or in person."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="appointment-form"
            isLoading={save.isPending}
            leadingIcon={<CalendarPlus size={16} />}
          >
            {isEditing ? "Save changes" : "Create appointment"}
          </Button>
        </>
      }
    >
      <form id="appointment-form" className="stack" onSubmit={onSubmit} noValidate>
        {save.error ? <Alert tone="error">{getErrorMessage(save.error)}</Alert> : null}

        {customers.length === 0 ? (
          <Alert tone="warning" title="No customers yet">
            The AI receptionist creates a customer record the first time it takes a booking. You can
            also add one from the Customers page before scheduling manually.
          </Alert>
        ) : null}

        <div className="form-grid">
          <Field label="Customer" htmlFor="appointment-customer" required error={errors.customerId?.message}>
            <Select
              id="appointment-customer"
              invalid={Boolean(errors.customerId)}
              {...register("customerId")}
            >
              <option value="">Select a customer…</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} · {customer.phone}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Service" htmlFor="appointment-service" required error={errors.serviceId?.message}>
            <Select
              id="appointment-service"
              invalid={Boolean(errors.serviceId)}
              {...register("serviceId")}
            >
              <option value="">Select a service…</option>
              {activeServices.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.durationMinutes} min
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Team member"
            htmlFor="appointment-staff"
            required
            error={errors.staffId?.message}
            hint={
              serviceId && linkedStaff.length === 0
                ? "Nobody is linked to this service yet, so the full roster is shown."
                : undefined
            }
          >
            <Select
              id="appointment-staff"
              invalid={Boolean(errors.staffId)}
              disabled={!serviceId}
              {...register("staffId")}
            >
              <option value="">{serviceId ? "Select a team member…" : "Choose a service first"}</option>
              {staffOptions.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} · {member.role}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Starts"
            htmlFor="appointment-start"
            required
            error={errors.startTime?.message}
            hint={endIso ? `Ends at ${formatTime(endIso)} (${service?.durationMinutes ?? 0} min)` : undefined}
          >
            <Input
              id="appointment-start"
              type="datetime-local"
              invalid={Boolean(errors.startTime)}
              {...register("startTime")}
            />
          </Field>

          <Field
            label="Status"
            htmlFor="appointment-status"
            error={errors.status?.message}
            hint="The AI receptionist only creates BOOKED appointments."
          >
            <Select id="appointment-status" {...register("status")}>
              {APPOINTMENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Notes" htmlFor="appointment-notes" error={errors.notes?.message} className="form-grid__full">
            <Textarea
              id="appointment-notes"
              placeholder="Anything the team should know before the visit."
              rows={3}
              {...register("notes")}
            />
          </Field>
        </div>

        {conflict ? (
          <Alert tone="warning" title="This slot already has a booking">
            <span className="row" style={{ gap: 6 }}>
              <AlertTriangle size={14} aria-hidden="true" />
              {conflict.customer?.name ?? "Another customer"} is booked for{" "}
              {formatDateTimeRange(conflict.startTime, conflict.endTime)} with the same team member.
              The backend does not reject overlaps for manual entries, so save only if double-booking
              is intended.
            </span>
          </Alert>
        ) : null}
      </form>
    </Modal>
  );
}
