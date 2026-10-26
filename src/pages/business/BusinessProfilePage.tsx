import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, IdCard, Save, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { businessService } from "@/services/businessService";
import { getErrorMessage } from "@/api/apiError";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Alert, ErrorState, LoadingBlock } from "@/components/ui/Feedback";
import { ChatLinkCard } from "@/features/business/ChatLinkCard";
import { ROLE_LABELS } from "@/constants/domain";
import { formatDate } from "@/utils/format";

const profileSchema = z.object({
  name: z.string().trim().min(1, "Business name is required").max(255),
  industry: z.string().trim().min(1, "Industry is required").max(255),
  phone: z.string().trim().max(50).optional(),
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: "Enter a valid email address",
    }),
  address: z.string().trim().max(500).optional(),
  description: z.string().trim().max(2000).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function BusinessProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const businessId = user?.businessId ?? "";

  const businessQuery = useAsyncData((signal) => businessService.getById(businessId, signal), [businessId], {
    enabled: Boolean(businessId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      industry: "",
      phone: "",
      email: "",
      address: "",
      description: "",
    },
  });

  const business = businessQuery.data;

  useEffect(() => {
    if (!business) return;
    reset({
      name: business.name,
      industry: business.industry,
      phone: business.phone ?? "",
      email: business.email ?? "",
      address: business.address ?? "",
      description: business.description ?? "",
    });
  }, [business, reset]);

  const save = useAsyncAction(async (values: ProfileFormValues) =>
    businessService.update(businessId, {
      name: values.name.trim(),
      industry: values.industry.trim(),
      phone: values.phone?.trim() ? values.phone.trim() : null,
      email: values.email?.trim() ? values.email.trim() : null,
      address: values.address?.trim() ? values.address.trim() : null,
      description: values.description?.trim() ? values.description.trim() : null,
    }),
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await save.run(values);
      businessQuery.mutate(() => updated);
      toast.success("Business profile saved", "The receptionist answers from these details immediately.");
    } catch (error) {
      toast.error("Could not save the profile", getErrorMessage(error));
    }
  });

  if (!businessId) {
    return (
      <Alert tone="error">
        This administrator account is not linked to a business, so there is no profile to edit.
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title="Business profile"
        description="Everything here is used verbatim by the AI receptionist when a customer asks about your business."
      />

      {businessQuery.error ? (
        <ErrorState error={businessQuery.error} onRetry={businessQuery.reload} />
      ) : businessQuery.isLoading ? (
        <LoadingBlock label="Loading business profile…" />
      ) : (
        <div className="split">
          <div className="card card--padded">
            <form className="stack" onSubmit={onSubmit} noValidate>
              {save.error ? <Alert tone="error">{getErrorMessage(save.error)}</Alert> : null}

              <div className="form-grid">
                <Field label="Business name" htmlFor="profile-name" required error={errors.name?.message}>
                  <Input id="profile-name" invalid={Boolean(errors.name)} {...register("name")} />
                </Field>

                <Field
                  label="Industry"
                  htmlFor="profile-industry"
                  required
                  error={errors.industry?.message}
                  hint="e.g. Dental clinic, Salon, Physiotherapy"
                >
                  <Input id="profile-industry" invalid={Boolean(errors.industry)} {...register("industry")} />
                </Field>

                <Field label="Phone" htmlFor="profile-phone" error={errors.phone?.message}>
                  <Input id="profile-phone" type="tel" {...register("phone")} />
                </Field>

                <Field label="Email" htmlFor="profile-email" error={errors.email?.message}>
                  <Input id="profile-email" type="email" {...register("email")} />
                </Field>

                <Field label="Address" htmlFor="profile-address" error={errors.address?.message} className="form-grid__full">
                  <Input id="profile-address" {...register("address")} />
                </Field>

                <Field
                  label="Description"
                  htmlFor="profile-description"
                  error={errors.description?.message}
                  hint="A sentence or two about what you do. The agent can quote it."
                  className="form-grid__full"
                >
                  <Textarea id="profile-description" rows={4} {...register("description")} />
                </Field>
              </div>

              <div className="form-actions">
                <Button
                  variant="secondary"
                  onClick={() => business && reset()}
                  disabled={!isDirty || save.isPending}
                >
                  Discard changes
                </Button>
                <Button type="submit" isLoading={save.isPending} leadingIcon={<Save size={15} />}>
                  Save profile
                </Button>
              </div>
            </form>
          </div>

          <div className="stack stack--loose">
            <ChatLinkCard businessId={businessId} businessName={business?.name} />

            <div className="card card--padded">
              <div className="row">
                <span className="chat-link__icon" aria-hidden="true">
                  <IdCard size={16} />
                </span>
                <div>
                  <p className="card__title">Business ID</p>
                  <p className="card__subtitle">Used in the customer chat link. It cannot be changed.</p>
                </div>
              </div>
              <p className="chat-link__value section">
                <code className="chat-link__code">{businessId}</code>
              </p>
            </div>

            <div className="card card--padded">
              <div className="row">
                <span className="chat-link__icon" aria-hidden="true">
                  <Building2 size={16} />
                </span>
                <div>
                  <p className="card__title">Record</p>
                  <p className="card__subtitle">Read-only metadata from the platform database.</p>
                </div>
              </div>
              <div className="detail-list detail-list--single section">
                <div className="detail-list__item">
                  <p className="detail-list__label">Created</p>
                  <p className="detail-list__value">{formatDate(business?.createdAt)}</p>
                </div>
                <div className="detail-list__item">
                  <p className="detail-list__label">Last updated</p>
                  <p className="detail-list__value">{formatDate(business?.updatedAt)}</p>
                </div>
              </div>
            </div>

            <div className="card card--padded">
              <div className="row">
                <span className="chat-link__icon" aria-hidden="true">
                  <ShieldCheck size={16} />
                </span>
                <div>
                  <p className="card__title">Your account</p>
                  <p className="card__subtitle">Managed by a platform administrator.</p>
                </div>
              </div>
              <div className="detail-list detail-list--single section">
                <div className="detail-list__item">
                  <p className="detail-list__label">Signed in as</p>
                  <p className="detail-list__value">{user?.email}</p>
                </div>
                <div className="detail-list__item">
                  <p className="detail-list__label">Role</p>
                  <p className="detail-list__value">{user ? ROLE_LABELS[user.role] : "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
