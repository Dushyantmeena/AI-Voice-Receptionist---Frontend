import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserPlus } from "lucide-react";
import type { Service, Staff } from "@/types/domain";
import { staffService } from "@/services/staffService";
import { getErrorMessage } from "@/api/apiError";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Field, Input, Switch, Textarea } from "@/components/ui/Field";
import { useAsyncAction } from "@/hooks/useAsyncAction";

const staffSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(255),
    role: z.string().trim().min(1, "Role is required").max(255),
    bio: z.string().max(2000, "Bio is limited to 2000 characters").optional(),
    isActive: z.boolean(),
    email: z.string().optional(),
    password: z.string().optional(),
    serviceIds: z.array(z.string()).optional(),
  })
  .superRefine((values, ctx) => {
    const email = values.email?.trim() ?? "";
    const password = values.password ?? "";

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Enter a valid email address" });
    }
    if (email && password.length < 6) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Set a password of at least 6 characters for this login",
      });
    }
    if (!email && password) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "An email is required for a login" });
    }
  });

type StaffFormValues = z.infer<typeof staffSchema>;

interface StaffFormModalProps {
  open: boolean;
  onClose: () => void;
  businessId: string;
  staffMember: Staff | null;
  services: Service[];
  onSaved: () => void;
}

export function StaffFormModal({
  open,
  onClose,
  businessId,
  staffMember,
  services,
  onSaved,
}: StaffFormModalProps) {
  const isEditing = Boolean(staffMember);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      role: "",
      bio: "",
      isActive: true,
      email: "",
      password: "",
      serviceIds: [],
    },
  });

  useEffect(() => {
    if (!open) return;

    reset({
      name: staffMember?.name ?? "",
      role: staffMember?.role ?? "",
      bio: staffMember?.bio ?? "",
      isActive: staffMember?.isActive ?? true,
      email: "",
      password: "",
      serviceIds: (staffMember?.services ?? []).map((link) => link.serviceId),
    });
  }, [open, reset, staffMember]);

  const isActive = watch("isActive");
  const selectedServiceIds = watch("serviceIds") ?? [];

  const activeServices = useMemo(
    () => services.filter((service) => service.isActive),
    [services],
  );

  const save = useAsyncAction(async (values: StaffFormValues) => {
    if (staffMember) {
      return staffService.update(staffMember.id, {
        name: values.name.trim(),
        role: values.role.trim(),
        bio: values.bio?.trim() ? values.bio.trim() : null,
        isActive: values.isActive,
      });
    }

    const email = values.email?.trim() ?? "";
    const password = values.password ?? "";

    return staffService.provision({
      businessId,
      name: values.name.trim(),
      role: values.role.trim(),
      bio: values.bio?.trim() ? values.bio.trim() : null,
      ...(email ? { email, password } : {}),
      serviceIds: values.serviceIds ?? [],
    });
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.run(values);
      onSaved();
    } catch {
      // Error surfaced through `save.error`.
    }
  });

  const toggleService = (serviceId: string) => {
    const current = selectedServiceIds;
    setValue(
      "serviceIds",
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
      { shouldDirty: true },
    );
  };

  return (
    <Modal
      open={open}
      onClose={save.isPending ? () => undefined : onClose}
      size="lg"
      title={isEditing ? "Edit team member" : "Add team member"}
      description={
        isEditing
          ? "Updates the roster entry. Service assignments are managed by the AI agent's booking rules."
          : "Adds someone to the roster, optionally with their own staff login."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="staff-form"
            isLoading={save.isPending}
            leadingIcon={<UserPlus size={16} />}
          >
            {isEditing ? "Save changes" : "Add to team"}
          </Button>
        </>
      }
    >
      <form id="staff-form" className="stack" onSubmit={onSubmit} noValidate>
        {save.error ? <Alert tone="error">{getErrorMessage(save.error)}</Alert> : null}

        <div className="form-grid">
          <Field label="Full name" htmlFor="staff-name" required error={errors.name?.message}>
            <Input id="staff-name" invalid={Boolean(errors.name)} {...register("name")} />
          </Field>

          <Field
            label="Role"
            htmlFor="staff-role"
            required
            error={errors.role?.message}
            hint="Free text — e.g. Senior Stylist, Physiotherapist."
          >
            <Input id="staff-role" invalid={Boolean(errors.role)} {...register("role")} />
          </Field>

          <Field label="Bio" htmlFor="staff-bio" error={errors.bio?.message} className="form-grid__full">
            <Textarea
              id="staff-bio"
              rows={3}
              placeholder="Short introduction the receptionist can mention."
              {...register("bio")}
            />
          </Field>

          <div className="form-grid__full">
            <Switch
              id="staff-active"
              label="Available for bookings"
              checked={isActive}
              onChange={(checked) => setValue("isActive", checked, { shouldDirty: true })}
            />
          </div>
        </div>

        {isEditing ? (
          <Alert tone="info" title="Service assignments are fixed at creation">
            The backend exposes no endpoint to change which services a staff member performs, so this
            screen only edits the profile. Create a new roster entry to change assignments.
          </Alert>
        ) : (
          <>
            <div>
              <p className="section__title">Services this person performs</p>
              <p className="text-sm text-muted">
                The AI receptionist only offers linked staff for a service. Selecting nothing means the
                person is never proposed automatically.
              </p>
              {activeServices.length === 0 ? (
                <Alert tone="warning">Create a service first so it can be assigned here.</Alert>
              ) : (
                <div className="choice-list">
                  {activeServices.map((service) => (
                    <label className="checkbox" key={service.id}>
                      <input
                        type="checkbox"
                        checked={selectedServiceIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                      />
                      {service.name}
                      <span className="text-xs text-muted">· {service.durationMinutes} min</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="form-grid">
              <Field
                label="Login email"
                htmlFor="staff-email"
                error={errors.email?.message}
                hint="Leave blank to create a roster entry without dashboard access."
              >
                <Input
                  id="staff-email"
                  type="email"
                  autoComplete="off"
                  invalid={Boolean(errors.email)}
                  {...register("email")}
                />
              </Field>

              <Field
                label="Temporary password"
                htmlFor="staff-password"
                error={errors.password?.message}
                hint="At least 6 characters. Required when an email is set."
              >
                <Input
                  id="staff-password"
                  type="password"
                  autoComplete="new-password"
                  invalid={Boolean(errors.password)}
                  {...register("password")}
                />
              </Field>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
