import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Scissors } from "lucide-react";
import type { Service } from "@/types/domain";
import { serviceCatalogService } from "@/services/serviceCatalogService";
import { getErrorMessage } from "@/api/apiError";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Field, Input, Switch, Textarea } from "@/components/ui/Field";
import { CURRENCY_CODE } from "@/utils/format";
import { useAsyncAction } from "@/hooks/useAsyncAction";

const serviceSchema = z.object({
  name: z.string().trim().min(1, "Service name is required").max(255),
  description: z.string().max(2000, "Description is limited to 2000 characters").optional(),
  durationMinutes: z.coerce
    .number({ message: "Enter a duration in minutes" })
    .int("Use whole minutes")
    .min(5, "Duration must be at least 5 minutes")
    .max(1440, "Duration cannot exceed a day"),
  price: z.coerce.number({ message: "Enter a price" }).min(0, "Price cannot be negative"),
  isActive: z.boolean(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  service: Service | null;
  onSaved: () => void;
}

export function ServiceFormModal({
  open,
  onClose,
  businessId,
  service,
  onSaved,
}: ServiceFormModalProps) {
  const isEditing = Boolean(service);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      durationMinutes: 30,
      price: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (!open) return;

    reset({
      name: service?.name ?? "",
      description: service?.description ?? "",
      durationMinutes: service?.durationMinutes ?? 30,
      price: service ? Number(service.price) : 0,
      isActive: service?.isActive ?? true,
    });
  }, [open, reset, service]);

  const isActive = watch("isActive");

  const save = useAsyncAction(async (values: ServiceFormValues) => {
    const body = {
      name: values.name.trim(),
      description: values.description?.trim() ? values.description.trim() : null,
      durationMinutes: values.durationMinutes,
      price: values.price,
      isActive: values.isActive,
    };

    return service
      ? serviceCatalogService.update(service.id, body)
      : serviceCatalogService.create({ businessId, ...body });
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.run(values);
      onSaved();
    } catch {
      // Error surfaced through `save.error`.
    }
  });

  return (
    <Modal
      open={open}
      onClose={save.isPending ? () => undefined : onClose}
      title={isEditing ? "Edit service" : "New service"}
      description={
        isEditing
          ? "Updates what the AI receptionist quotes and how long it books."
          : "Adds the service to the catalogue the receptionist reads from."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="service-form"
            isLoading={save.isPending}
            leadingIcon={<Scissors size={16} />}
          >
            {isEditing ? "Save changes" : "Create service"}
          </Button>
        </>
      }
    >
      <form id="service-form" className="stack" onSubmit={onSubmit} noValidate>
        {save.error ? <Alert tone="error">{getErrorMessage(save.error)}</Alert> : null}

        <div className="form-grid">
          <Field
            label="Service name"
            htmlFor="service-name"
            required
            error={errors.name?.message}
            className="form-grid__full"
          >
            <Input id="service-name" invalid={Boolean(errors.name)} {...register("name")} />
          </Field>

          <Field
            label="Duration (minutes)"
            htmlFor="service-duration"
            required
            error={errors.durationMinutes?.message}
            hint="The end time of every booking is derived from this value."
          >
            <Input
              id="service-duration"
              type="number"
              min={5}
              step={5}
              invalid={Boolean(errors.durationMinutes)}
              {...register("durationMinutes")}
            />
          </Field>

          <Field
            label={`Price (${CURRENCY_CODE})`}
            htmlFor="service-price"
            required
            error={errors.price?.message}
            hint="Stored as a decimal — the receptionist quotes this amount verbatim."
          >
            <Input
              id="service-price"
              type="number"
              min={0}
              step="0.01"
              invalid={Boolean(errors.price)}
              {...register("price")}
            />
          </Field>

          <Field
            label="Description"
            htmlFor="service-description"
            error={errors.description?.message}
            className="form-grid__full"
          >
            <Textarea
              id="service-description"
              rows={3}
              placeholder="What the service includes, who it suits, anything to prepare."
              {...register("description")}
            />
          </Field>

          <div className="form-grid__full">
            <Switch
              id="service-active"
              label="Visible to the AI receptionist"
              checked={isActive}
              onChange={(checked) => setValue("isActive", checked, { shouldDirty: true })}
            />
          </div>
        </div>

        {isEditing ? (
          <Alert tone="info">
            Changing the duration affects new bookings only. Appointments already in the calendar keep
            the times they were booked with.
          </Alert>
        ) : null}
      </form>
    </Modal>
  );
}
