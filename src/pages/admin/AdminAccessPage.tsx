import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Check, KeyRound, ShieldCheck, UserCog, UserPlus, Users } from "lucide-react";
import type { Staff } from "@/types/domain";
import { useToast } from "@/contexts/ToastContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { businessService } from "@/services/businessService";
import { staffService } from "@/services/staffService";
import { serviceCatalogService } from "@/services/serviceCatalogService";
import { getErrorMessage } from "@/api/apiError";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Alert, EmptyState, ErrorState, LoadingBlock } from "@/components/ui/Feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";

/**
 * Access control page.
 *
 * The backend exposes no user directory: accounts only exist because a business
 * was onboarded or a staff login was provisioned. This screen therefore does not
 * pretend to list users — it explains the role model and drives the one endpoint
 * that creates credentials (`POST /staff/provision`).
 */
const accessSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  role: z.string().trim().min(1, "Job title is required").max(255),
  bio: z.string().max(2000, "Bio is limited to 2000 characters").optional(),
  email: z.string().trim().min(1, "Login email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Use at least 6 characters"),
  serviceIds: z.array(z.string()).optional(),
});

type AccessFormValues = z.infer<typeof accessSchema>;

const ROLE_MATRIX = [
  {
    role: "Super Admin",
    tone: "brand" as const,
    scope: "Entire platform",
    icon: ShieldCheck,
    capabilities: [
      "Onboard a business together with its first administrator login",
      "Edit any business profile and delete tenants",
      "Read every conversation across all businesses",
      "Provision staff logins for any business",
    ],
    limits: ["Cannot book appointments on behalf of a tenant"],
  },
  {
    role: "Business Admin",
    tone: "info" as const,
    scope: "One business",
    icon: Building2,
    capabilities: [
      "Create staff, services and customers",
      "Book, reschedule and delete appointments",
      "Manage each staff member's availability slots",
      "Read the tenant's AI conversations and chat link",
    ],
    limits: ["Cannot create other businesses or platform administrators"],
  },
  {
    role: "Staff",
    tone: "neutral" as const,
    scope: "Own calendar",
    icon: UserCog,
    capabilities: [
      "See only appointments assigned to them",
      "Update the status of their own appointments",
      "Replace their own weekly availability",
    ],
    limits: ["Cannot create appointments, customers or services"],
  },
];

export default function AdminAccessPage() {
  const toast = useToast();

  const [businessId, setBusinessId] = useState("");
  const [lastProvisioned, setLastProvisioned] = useState<{ name: string; email: string } | null>(null);

  const businessesQuery = useAsyncData(() => businessService.list({ page: 1, limit: 100 }), []);
  const businesses = businessesQuery.data?.data ?? [];
  const selectedBusiness = businesses.find((business) => business.id === businessId) ?? null;

  const servicesQuery = useAsyncData(
    () => serviceCatalogService.list({ page: 1, limit: 100, businessId }),
    [businessId],
    { enabled: Boolean(businessId) },
  );
  const services = servicesQuery.data?.data ?? [];
  const activeServices = services.filter((service) => service.isActive);

  const rosterQuery = useAsyncData(
    () => staffService.list({ page: 1, limit: 100, businessId }),
    [businessId],
    { enabled: Boolean(businessId) },
  );
  const roster = rosterQuery.data?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AccessFormValues>({
    resolver: zodResolver(accessSchema),
    defaultValues: { name: "", role: "", bio: "", email: "", password: "", serviceIds: [] },
  });

  const selectedServiceIds = watch("serviceIds") ?? [];

  // A roster entry is always created inside one specific business.
  useEffect(() => {
    reset({ name: "", role: "", bio: "", email: "", password: "", serviceIds: [] });
    setLastProvisioned(null);
  }, [businessId, reset]);

  const provision = useAsyncAction(async (values: AccessFormValues) =>
    staffService.provision({
      businessId,
      name: values.name.trim(),
      role: values.role.trim(),
      bio: values.bio?.trim() ? values.bio.trim() : null,
      email: values.email.trim(),
      password: values.password,
      serviceIds: values.serviceIds ?? [],
    }),
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      await provision.run(values);
      toast.success(
        "Staff login created",
        `${values.name.trim()} can now sign in. Share the temporary password securely.`,
      );
      setLastProvisioned({ name: values.name.trim(), email: values.email.trim() });
      reset({ name: "", role: "", bio: "", email: "", password: "", serviceIds: [] });
      rosterQuery.reload();
    } catch {
      // `provision.error` is rendered inside the form.
    }
  });

  const toggleService = (serviceId: string) => {
    setValue(
      "serviceIds",
      selectedServiceIds.includes(serviceId)
        ? selectedServiceIds.filter((id) => id !== serviceId)
        : [...selectedServiceIds, serviceId],
      { shouldDirty: true },
    );
  };

  const rosterColumns: DataTableColumn<Staff>[] = [
    {
      id: "name",
      header: "Roster entry",
      cell: (row) => (
        <div className="table-person__body">
          <p className="table-person__name">{row.name}</p>
          <p className="table-person__meta">{row.role}</p>
        </div>
      ),
    },
    {
      id: "services",
      header: "Services",
      cell: (row) => (
        <span className="text-sm text-secondary">
          {row.services && row.services.length > 0 ? `${row.services.length} linked` : "None linked"}
        </span>
      ),
    },
    {
      id: "hours",
      header: "Weekly hours",
      cell: (row) => <span className="text-sm">{row.availabilities?.length ?? 0} windows</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) =>
        row.isActive ? <Badge tone="success">Available</Badge> : <Badge tone="neutral">Inactive</Badge>,
    },
  ];

  return (
    <>
      <PageHeader
        title="User access"
        description="Who can sign in, and what each role is allowed to do. Accounts are only created by onboarding a business or provisioning a staff login."
      />

      <Alert tone="info" title="This backend has no user-management endpoint">
        There is no API to list platform users, change a password or deactivate an account. Access is
        granted through <code className="text-mono">POST /api/businesses</code> (first administrator) and{" "}
        <code className="text-mono">POST /api/staff/provision</code> (staff login). Deactivating a staff
        member keeps the login record but blocks it at authentication time.
      </Alert>

      <div className="grid grid--3 section">
        {ROLE_MATRIX.map((entry) => {
          const Icon = entry.icon;
          return (
            <div className="card card--padded" key={entry.role}>
              <div className="panel-head">
                <span className="chat-link__icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <div>
                  <p className="card__title">{entry.role}</p>
                  <p className="card__subtitle">{entry.scope}</p>
                </div>
              </div>

              <div className="stack stack--tight">
                {entry.capabilities.map((capability) => (
                  <div className="row" key={capability}>
                    <Check size={14} aria-hidden="true" className="text-success" />
                    <span className="text-sm text-secondary">{capability}</span>
                  </div>
                ))}
              </div>

              <div className="stack stack--tight section">
                {entry.limits.map((limit) => (
                  <p className="text-xs text-muted" key={limit}>
                    Not allowed: {limit.toLowerCase()}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="split section">
        <div className="card card--padded">
          <div className="panel-head">
            <span className="chat-link__icon" aria-hidden="true">
              <UserPlus size={16} />
            </span>
            <div>
              <p className="card__title">Create a staff login</p>
              <p className="card__subtitle">
                Adds a roster entry and its STAFF credentials in one transaction.
              </p>
            </div>
          </div>

          {businessesQuery.error ? (
            <ErrorState error={businessesQuery.error} onRetry={businessesQuery.reload} />
          ) : businessesQuery.isLoading ? (
            <LoadingBlock label="Loading businesses…" />
          ) : businesses.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No businesses to attach a login to"
              message="Onboard a business first — every login belongs to exactly one tenant."
            />
          ) : (
            <form className="stack" onSubmit={onSubmit} noValidate>
              <Field
                label="Business"
                htmlFor="access-business"
                required
                hint="Staff accounts see only this tenant's data."
              >
                <Select
                  id="access-business"
                  value={businessId}
                  onChange={(event) => setBusinessId(event.currentTarget.value)}
                >
                  <option value="">Choose a business…</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </Select>
              </Field>

              {provision.error ? <Alert tone="error">{getErrorMessage(provision.error)}</Alert> : null}

              {lastProvisioned ? (
                <Alert tone="success" title="Login created">
                  {lastProvisioned.name} · {lastProvisioned.email}. The password is hashed on the server
                  and cannot be read again.
                </Alert>
              ) : null}

              <div className="form-grid">
                <Field label="Full name" htmlFor="access-name" required error={errors.name?.message}>
                  <Input
                    id="access-name"
                    disabled={!businessId}
                    invalid={Boolean(errors.name)}
                    {...register("name")}
                  />
                </Field>

                <Field
                  label="Job title"
                  htmlFor="access-role"
                  required
                  error={errors.role?.message}
                  hint="Free text, e.g. Receptionist, Senior Stylist."
                >
                  <Input
                    id="access-role"
                    disabled={!businessId}
                    invalid={Boolean(errors.role)}
                    {...register("role")}
                  />
                </Field>

                <Field label="Bio" htmlFor="access-bio" error={errors.bio?.message} className="form-grid__full">
                  <Textarea id="access-bio" rows={2} disabled={!businessId} {...register("bio")} />
                </Field>

                <Field
                  label="Login email"
                  htmlFor="access-email"
                  required
                  error={errors.email?.message}
                  hint="Must be unique across the whole platform."
                >
                  <Input
                    id="access-email"
                    type="email"
                    autoComplete="off"
                    disabled={!businessId}
                    invalid={Boolean(errors.email)}
                    {...register("email")}
                  />
                </Field>

                <Field
                  label="Temporary password"
                  htmlFor="access-password"
                  required
                  error={errors.password?.message}
                  hint="At least 6 characters. Share it out-of-band."
                >
                  <Input
                    id="access-password"
                    type="password"
                    autoComplete="new-password"
                    disabled={!businessId}
                    invalid={Boolean(errors.password)}
                    {...register("password")}
                  />
                </Field>
              </div>

              <div>
                <p className="section__title">Services this person performs</p>
                <p className="text-sm text-muted">
                  Link services so the AI receptionist can propose this person for them.
                </p>

                {!businessId ? (
                  <p className="muted-block section">Choose a business to load its service catalogue.</p>
                ) : servicesQuery.isLoading ? (
                  <LoadingBlock label="Loading services…" />
                ) : servicesQuery.error ? (
                  <ErrorState error={servicesQuery.error} onRetry={servicesQuery.reload} />
                ) : activeServices.length === 0 ? (
                  <Alert tone="warning">
                    This business has no active services yet. The login can still be created, but the AI
                    agent will never offer it for a booking.
                  </Alert>
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

              <div className="form-actions">
                <Button
                  type="submit"
                  isLoading={provision.isPending}
                  disabled={!businessId}
                  leadingIcon={<KeyRound size={15} />}
                >
                  Create login
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="stack stack--loose">
          <div className="card card--padded">
            <p className="card__title">Role notes</p>
            <p className="card__subtitle">Behaviour enforced by the API, not by the UI.</p>
            <div className="stack stack--tight section">
              <p className="text-sm text-secondary">
                A staff member&apos;s <strong>role</strong> is a job title. Their authentication role is
                always <code className="text-mono">STAFF</code>.
              </p>
              <p className="text-sm text-secondary">
                Deactivating a staff member blocks sign-in because the token middleware rejects inactive
                users.
              </p>
              <p className="text-sm text-secondary">
                The API never returns passwords or password hashes, so this page cannot show existing
                credentials.
              </p>
            </div>
          </div>

          <div className="card card--padded">
            <div className="row">
              <Users size={16} aria-hidden="true" className="text-muted" />
              <p className="card__title">
                {selectedBusiness ? `${selectedBusiness.name} roster` : "Tenant roster"}
              </p>
            </div>
            <p className="card__subtitle">
              Roster entries for the selected business. The API does not expose whether an entry has a
              login.
            </p>

            {!businessId ? (
              <p className="muted-block section">Choose a business to load its roster.</p>
            ) : rosterQuery.error ? (
              <ErrorState error={rosterQuery.error} onRetry={rosterQuery.reload} />
            ) : (
              <div className="section">
                <DataTable
                  columns={rosterColumns}
                  rows={roster}
                  rowKey={(row) => row.id}
                  caption="Roster entries"
                  isLoading={rosterQuery.isLoading}
                  empty={
                    <EmptyState
                      icon={Users}
                      title="No roster entries yet"
                      message="Provisioning a login creates the first one."
                    />
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
