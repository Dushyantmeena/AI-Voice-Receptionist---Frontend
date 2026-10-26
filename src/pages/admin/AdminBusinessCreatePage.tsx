import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Building2, CheckCircle2, UserCog } from "lucide-react";
import type { Business } from "@/types/domain";
import { adminService } from "@/services/adminService";
import { getErrorMessage } from "@/api/apiError";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { ChatLinkCard } from "@/features/business/ChatLinkCard";
import { PATHS } from "@/routes/paths";

const createSchema = z.object({
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
  adminName: z.string().trim().min(1, "Administrator name is required").max(255),
  adminEmail: z.string().trim().email("Enter a valid email address").max(255),
  adminPassword: z.string().min(6, "Use at least 6 characters"),
});

type CreateFormValues = z.infer<typeof createSchema>;

export default function AdminBusinessCreatePage() {
  const navigate = useNavigate();
  const [created, setCreated] = useState<Business | null>(null);
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      industry: "",
      phone: "",
      email: "",
      address: "",
      description: "",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
    },
  });

  const create = useAsyncAction(async (values: CreateFormValues) =>
    adminService.registerBusiness({
      name: values.name.trim(),
      industry: values.industry.trim(),
      phone: values.phone?.trim() ? values.phone.trim() : null,
      email: values.email?.trim() ? values.email.trim() : null,
      address: values.address?.trim() ? values.address.trim() : null,
      description: values.description?.trim() ? values.description.trim() : null,
      adminName: values.adminName.trim(),
      adminEmail: values.adminEmail.trim(),
      adminPassword: values.adminPassword,
    }),
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      const business = await create.run(values);
      setAdmin({ name: values.adminName.trim(), email: values.adminEmail.trim() });
      setCreated(business);
    } catch {
      // `create.error` is rendered in the form.
    }
  });

  if (created) {
    return (
      <>
        <PageHeader
          eyebrow="Onboarding"
          title="Business created"
          description="The tenant and its first administrator login exist now. Share the credentials securely — the password is not readable again."
          actions={
            <Button
              variant="secondary"
              leadingIcon={<ArrowLeft size={15} />}
              onClick={() => navigate(PATHS.adminBusinesses)}
            >
              Back to businesses
            </Button>
          }
        />

        <div className="split">
          <div className="card card--padded stack">
            <div className="row">
              <span className="chat-link__icon" aria-hidden="true">
                <CheckCircle2 size={17} />
              </span>
              <div>
                <p className="card__title">{created.name}</p>
                <p className="card__subtitle">{created.industry}</p>
              </div>
            </div>

            <div className="detail-list detail-list--single">
              <div className="detail-list__item">
                <p className="detail-list__label">Business ID</p>
                <p className="detail-list__value text-mono">{created.id}</p>
              </div>
              <div className="detail-list__item">
                <p className="detail-list__label">Administrator</p>
                <p className="detail-list__value">
                  {admin ? `${admin.name} · ${admin.email}` : "—"}
                </p>
              </div>
            </div>

            <Alert tone="info" title="Next steps">
              The Business Admin signs in to add services, build the roster, set weekly availability and
              share the customer chat link. Nothing is offered to customers until those exist.
            </Alert>

            <div className="detail-actions">
              <Link className="btn btn--primary" to={PATHS.adminBusiness(created.id)}>
                Open this business
              </Link>
              <Link className="btn btn--secondary" to={PATHS.adminBusinessNew} onClick={() => setCreated(null)}>
                Onboard another
              </Link>
            </div>
          </div>

          <ChatLinkCard businessId={created.id} businessName={created.name} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Onboarding"
        title="Onboard a business"
        description="Creates the tenant and its first Business Admin account in a single transaction."
        actions={
          <Button
            variant="ghost"
            leadingIcon={<ArrowLeft size={15} />}
            onClick={() => navigate(PATHS.adminBusinesses)}
          >
            Cancel
          </Button>
        }
      />

      <form className="stack" onSubmit={onSubmit} noValidate>
        {create.error ? (
          <Alert tone="error" title="Could not create the business">
            {getErrorMessage(create.error)}
          </Alert>
        ) : null}

        <div className="card card--padded">
          <div className="panel-head">
            <span className="chat-link__icon" aria-hidden="true">
              <Building2 size={16} />
            </span>
            <div>
              <p className="card__title">Business details</p>
              <p className="card__subtitle">The AI receptionist quotes these details verbatim.</p>
            </div>
          </div>

          <div className="form-grid">
            <Field label="Business name" htmlFor="create-name" required error={errors.name?.message}>
              <Input id="create-name" invalid={Boolean(errors.name)} {...register("name")} />
            </Field>

            <Field
              label="Industry"
              htmlFor="create-industry"
              required
              error={errors.industry?.message}
              hint="e.g. Dental clinic, Salon, Physiotherapy"
            >
              <Input id="create-industry" invalid={Boolean(errors.industry)} {...register("industry")} />
            </Field>

            <Field label="Phone" htmlFor="create-phone" error={errors.phone?.message}>
              <Input id="create-phone" type="tel" {...register("phone")} />
            </Field>

            <Field label="Email" htmlFor="create-email" error={errors.email?.message}>
              <Input id="create-email" type="email" {...register("email")} />
            </Field>

            <Field label="Address" htmlFor="create-address" error={errors.address?.message} className="form-grid__full">
              <Input id="create-address" {...register("address")} />
            </Field>

            <Field
              label="Description"
              htmlFor="create-description"
              error={errors.description?.message}
              className="form-grid__full"
            >
              <Textarea id="create-description" rows={3} {...register("description")} />
            </Field>
          </div>
        </div>

        <div className="card card--padded">
          <div className="panel-head">
            <span className="chat-link__icon" aria-hidden="true">
              <UserCog size={16} />
            </span>
            <div>
              <p className="card__title">First administrator</p>
              <p className="card__subtitle">
                This login gets the Business Admin role and access to this tenant only.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <Field label="Full name" htmlFor="create-admin-name" required error={errors.adminName?.message}>
              <Input id="create-admin-name" invalid={Boolean(errors.adminName)} {...register("adminName")} />
            </Field>

            <Field
              label="Login email"
              htmlFor="create-admin-email"
              required
              error={errors.adminEmail?.message}
              hint="This becomes the sign-in identifier."
            >
              <Input
                id="create-admin-email"
                type="email"
                autoComplete="off"
                invalid={Boolean(errors.adminEmail)}
                {...register("adminEmail")}
              />
            </Field>

            <Field
              label="Temporary password"
              htmlFor="create-admin-password"
              required
              error={errors.adminPassword?.message}
              hint="Minimum 6 characters. Share it out-of-band; it is hashed and cannot be read again."
            >
              <Input
                id="create-admin-password"
                type="password"
                autoComplete="new-password"
                invalid={Boolean(errors.adminPassword)}
                {...register("adminPassword")}
              />
            </Field>
          </div>
        </div>

        <div className="form-actions">
          <Link className="btn btn--secondary" to={PATHS.adminBusinesses}>
            Cancel
          </Link>
          <Button type="submit" isLoading={create.isPending} leadingIcon={<Building2 size={15} />}>
            Create business and admin
          </Button>
        </div>
      </form>
    </>
  );
}
