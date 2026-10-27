import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  CalendarDays,
  MessagesSquare,
  Plus,
  Save,
  Scissors,
  Trash2,
  Users,
} from "lucide-react";
import type { Appointment, Conversation, Service, Staff } from "@/types/domain";
import { useToast } from "@/contexts/ToastContext";
import { useAsyncData } from "@/hooks/useAsyncData";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { businessService } from "@/services/businessService";
import { staffService } from "@/services/staffService";
import { serviceCatalogService } from "@/services/serviceCatalogService";
import { appointmentService } from "@/services/appointmentService";
import { conversationService } from "@/services/conversationService";
import { ApiClientError, getErrorMessage } from "@/api/apiError";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Alert, EmptyState, ErrorState, LoadingBlock } from "@/components/ui/Feedback";
import { ConfirmDialog } from "@/components/ui/Modal";
import { StaffFormModal } from "@/features/staff/StaffFormModal";
import { ServiceFormModal } from "@/features/services/ServiceFormModal";
import { ConversationDetailModal } from "@/features/conversations/ConversationDetailModal";
import { ChatLinkCard } from "@/features/business/ChatLinkCard";
import { PATHS } from "@/routes/paths";
import { cn } from "@/utils/cn";
import { excerpt, formatCurrency, formatDate, formatDateTime, formatDateTimeRange } from "@/utils/format";

const editSchema = z.object({
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

type EditFormValues = z.infer<typeof editSchema>;

type TabId = "overview" | "staff" | "services" | "appointments" | "conversations";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "staff", label: "Staff" },
  { id: "services", label: "Services" },
  { id: "appointments", label: "Appointments" },
  { id: "conversations", label: "Conversations" },
];

export default function AdminBusinessDetailPage() {
  const { businessId = "" } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [tab, setTab] = useState<TabId>("overview");
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const businessQuery = useAsyncData((signal) => businessService.getById(businessId, signal), [businessId], {
    enabled: Boolean(businessId),
  });
  const staffQuery = useAsyncData(() => staffService.list({ page: 1, limit: 100, businessId }), [businessId], {
    enabled: Boolean(businessId),
  });
  const servicesQuery = useAsyncData(
    () => serviceCatalogService.list({ page: 1, limit: 100, businessId }),
    [businessId],
    { enabled: Boolean(businessId) },
  );
  const appointmentsQuery = useAsyncData(
    () => appointmentService.listNewestFirst({ page: 1, limit: 10, businessId }),
    [businessId],
    { enabled: Boolean(businessId) },
  );
  const conversationsQuery = useAsyncData(
    () => conversationService.listByBusiness(businessId, 1, 10),
    [businessId],
    { enabled: Boolean(businessId) },
  );

  const business = businessQuery.data;
  const staff = staffQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];
  const appointments = appointmentsQuery.data?.data ?? [];
  const conversations = conversationsQuery.data?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: "",
      industry: "",
      phone: "",
      email: "",
      address: "",
      description: "",
    },
  });

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

  const saveProfile = useAsyncAction(async (values: EditFormValues) =>
    businessService.update(businessId, {
      name: values.name.trim(),
      industry: values.industry.trim(),
      phone: values.phone?.trim() ? values.phone.trim() : null,
      email: values.email?.trim() ? values.email.trim() : null,
      address: values.address?.trim() ? values.address.trim() : null,
      description: values.description?.trim() ? values.description.trim() : null,
    }),
  );

  const removeBusiness = useAsyncAction(async () => businessService.remove(businessId));

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await saveProfile.run(values);
      businessQuery.mutate(() => updated);
      toast.success("Business updated");
    } catch (error) {
      toast.error("Could not save the business", getErrorMessage(error));
    }
  });

  const handleDeleteBusiness = async () => {
    try {
      await removeBusiness.run();
      toast.success("Business deleted");
      navigate(PATHS.adminBusinesses);
    } catch (error) {
      toast.error(
        "Could not delete the business",
        `${getErrorMessage(error)} Remove its appointments and conversations first.`,
      );
      setDeleting(false);
    }
  };

  if (!businessId) {
    return (
      <ErrorState error={new ApiClientError("notFound", "No business was selected.", 404)} />
    );
  }

  if (businessQuery.error) {
    return (
      <>
        <PageHeader title="Business" actions={<Link className="btn btn--secondary" to={PATHS.adminBusinesses}>Back</Link>} />
        <ErrorState error={businessQuery.error} onRetry={businessQuery.reload} />
      </>
    );
  }

  if (businessQuery.isLoading || !business) {
    return (
      <>
        <PageHeader title="Business" />
        <LoadingBlock label="Loading the tenant…" />
      </>
    );
  }

  const staffColumns: DataTableColumn<Staff>[] = [
    {
      id: "name",
      header: "Team member",
      cell: (row) => (
        <div className="table-person__body">
          <p className="table-person__name">{row.name}</p>
          <p className="table-person__meta">{row.role}</p>
        </div>
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

  const serviceColumns: DataTableColumn<Service>[] = [
    {
      id: "name",
      header: "Service",
      cell: (row) => (
        <div className="table-person__body">
          <p className="table-person__name">{row.name}</p>
          <p className="table-person__meta">{row.durationMinutes} min</p>
        </div>
      ),
    },
    {
      id: "price",
      header: "Price",
      align: "right",
      cell: (row) => formatCurrency(row.price),
    },
    {
      id: "status",
      header: "Visible",
      cell: (row) =>
        row.isActive ? <Badge tone="success">Live</Badge> : <Badge tone="neutral">Hidden</Badge>,
    },
  ];

  const appointmentColumns: DataTableColumn<Appointment>[] = [
    {
      id: "when",
      header: "When",
      cell: (row) => formatDateTimeRange(row.startTime, row.endTime),
    },
    {
      id: "customer",
      header: "Customer",
      cell: (row) => (
        <div className="table-person__body">
          <p className="table-person__name">{row.customer?.name ?? "Unknown"}</p>
          <p className="table-person__meta">{row.customer?.phone ?? "No phone"}</p>
        </div>
      ),
    },
    {
      id: "service",
      header: "Service",
      cell: (row) => row.service?.name ?? "—",
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
  ];

  return (
    <>
      <PageHeader
        eyebrow="Tenant"
        title={business.name}
        description={`${business.industry} · onboarded ${formatDate(business.createdAt)}`}
        actions={
          <>
            <Button
              variant="secondary"
              leadingIcon={<ArrowLeft size={15} />}
              onClick={() => navigate(PATHS.adminBusinesses)}
            >
              All businesses
            </Button>
            <Button variant="danger" leadingIcon={<Trash2 size={15} />} onClick={() => setDeleting(true)}>
              Delete
            </Button>
          </>
        }
      />

      <div className="row row--wrap section__head">
        <Badge tone="brand" dot={false}>
          {business.id}
        </Badge>
        {business.email ? <Badge tone="neutral" dot={false}>{business.email}</Badge> : null}
        {business.phone ? <Badge tone="neutral" dot={false}>{business.phone}</Badge> : null}
      </div>

      <div className="tabs" role="tablist" aria-label="Business sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className="tabs__tab"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={cn("section", "stack", "stack--loose")}>
        {tab === "overview" ? (
          <div className="split">
            <div className="card card--padded">
              <form className="stack" onSubmit={onSubmit} noValidate>
                {saveProfile.error ? <Alert tone="error">{getErrorMessage(saveProfile.error)}</Alert> : null}

                <div className="form-grid">
                  <Field label="Business name" htmlFor="admin-edit-name" required error={errors.name?.message}>
                    <Input id="admin-edit-name" invalid={Boolean(errors.name)} {...register("name")} />
                  </Field>

                  <Field label="Industry" htmlFor="admin-edit-industry" required error={errors.industry?.message}>
                    <Input
                      id="admin-edit-industry"
                      invalid={Boolean(errors.industry)}
                      {...register("industry")}
                    />
                  </Field>

                  <Field label="Phone" htmlFor="admin-edit-phone" error={errors.phone?.message}>
                    <Input id="admin-edit-phone" type="tel" {...register("phone")} />
                  </Field>

                  <Field label="Email" htmlFor="admin-edit-email" error={errors.email?.message}>
                    <Input id="admin-edit-email" type="email" {...register("email")} />
                  </Field>

                  <Field
                    label="Address"
                    htmlFor="admin-edit-address"
                    error={errors.address?.message}
                    className="form-grid__full"
                  >
                    <Input id="admin-edit-address" {...register("address")} />
                  </Field>

                  <Field
                    label="Description"
                    htmlFor="admin-edit-description"
                    error={errors.description?.message}
                    className="form-grid__full"
                  >
                    <Textarea id="admin-edit-description" rows={4} {...register("description")} />
                  </Field>
                </div>

                <div className="form-actions">
                  <Button variant="secondary" onClick={() => reset()} disabled={!isDirty || saveProfile.isPending}>
                    Discard
                  </Button>
                  <Button type="submit" isLoading={saveProfile.isPending} leadingIcon={<Save size={15} />}>
                    Save business
                  </Button>
                </div>
              </form>
            </div>

            <div className="stack stack--loose">
              <ChatLinkCard businessId={business.id} businessName={business.name} />

              <div className="card card--padded">
                <p className="card__title">Tenant footprint</p>
                <p className="card__subtitle">Records currently attached to this business.</p>
                <div className="detail-list section">
                  <div className="detail-list__item">
                    <p className="detail-list__label">Staff</p>
                    <p className="detail-list__value">{staff.length}</p>
                  </div>
                  <div className="detail-list__item">
                    <p className="detail-list__label">Services</p>
                    <p className="detail-list__value">{services.length}</p>
                  </div>
                  <div className="detail-list__item">
                    <p className="detail-list__label">Appointments</p>
                    <p className="detail-list__value">{appointmentsQuery.data?.meta.total ?? 0}</p>
                  </div>
                  <div className="detail-list__item">
                    <p className="detail-list__label">Conversations</p>
                    <p className="detail-list__value">{conversationsQuery.data?.meta.total ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "staff" ? (
          <div className="card">
            <div className="card__header">
              <div>
                <p className="card__title">Roster</p>
                <p className="card__subtitle">
                  Super Admins can provision staff logins for any tenant.
                </p>
              </div>
              <Button size="sm" leadingIcon={<Plus size={15} />} onClick={() => setStaffModalOpen(true)}>
                Add team member
              </Button>
            </div>
            {staffQuery.error ? (
              <ErrorState error={staffQuery.error} onRetry={staffQuery.reload} />
            ) : (
              <DataTable
                columns={staffColumns}
                rows={staff}
                rowKey={(row) => row.id}
                caption="Staff"
                isLoading={staffQuery.isLoading}
                empty={
                  <EmptyState
                    icon={Users}
                    title="No staff yet"
                    message="Without a roster the receptionist cannot match bookings to a person."
                    action={
                      <Button size="sm" leadingIcon={<Plus size={15} />} onClick={() => setStaffModalOpen(true)}>
                        Add the first team member
                      </Button>
                    }
                  />
                }
              />
            )}
          </div>
        ) : null}

        {tab === "services" ? (
          <div className="card">
            <div className="card__header">
              <div>
                <p className="card__title">Service catalogue</p>
                <p className="card__subtitle">What the receptionist quotes for this tenant.</p>
              </div>
              <Button size="sm" leadingIcon={<Plus size={15} />} onClick={() => setServiceModalOpen(true)}>
                New service
              </Button>
            </div>
            {servicesQuery.error ? (
              <ErrorState error={servicesQuery.error} onRetry={servicesQuery.reload} />
            ) : (
              <DataTable
                columns={serviceColumns}
                rows={services}
                rowKey={(row) => row.id}
                caption="Services"
                isLoading={servicesQuery.isLoading}
                empty={
                  <EmptyState
                    icon={Scissors}
                    title="No services yet"
                    message="The agent has nothing to offer until at least one service exists."
                    action={
                      <Button size="sm" leadingIcon={<Plus size={15} />} onClick={() => setServiceModalOpen(true)}>
                        Create the first service
                      </Button>
                    }
                  />
                }
              />
            )}
          </div>
        ) : null}

        {tab === "appointments" ? (
          <div className="card">
            <div className="card__header">
              <div>
                <p className="card__title">Calendar</p>
                <p className="card__subtitle">The 10 most recent bookings for this business.</p>
              </div>
            </div>
            {appointmentsQuery.error ? (
              <ErrorState error={appointmentsQuery.error} onRetry={appointmentsQuery.reload} />
            ) : (
              <DataTable
                columns={appointmentColumns}
                rows={appointments}
                rowKey={(row) => row.id}
                caption="Appointments"
                isLoading={appointmentsQuery.isLoading}
                empty={
                  <EmptyState
                    icon={CalendarDays}
                    title="No appointments"
                    message="Bookings made by the receptionist will show up here."
                  />
                }
              />
            )}
          </div>
        ) : null}

        {tab === "conversations" ? (
          <div className="card">
            <div className="card__header">
              <div>
                <p className="card__title">AI conversations</p>
                <p className="card__subtitle">The 10 most recent sessions for this tenant.</p>
              </div>
              <MessagesSquare size={16} aria-hidden="true" className="text-muted" />
            </div>

            {conversationsQuery.error ? (
              <ErrorState error={conversationsQuery.error} onRetry={conversationsQuery.reload} />
            ) : conversationsQuery.isLoading ? (
              <LoadingBlock label="Loading conversations…" />
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                title="No conversations"
                message="Sessions are stored as soon as a customer chats with this business."
              />
            ) : (
              <div className="record-list">
                {conversations.map((conversation) => (
                  <div className="record-list__item" key={conversation.id}>
                    <div className="row row--between">
                      <span className="table-person__name">
                        {conversation.customer?.name ?? "Unidentified customer"}
                      </span>
                      <span className="text-xs text-muted">{formatDateTime(conversation.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted">{excerpt(conversation.transcript, 130)}</p>
                    <div className="row row--between">
                      <span className="text-xs text-muted">{conversation.intent ?? "No intent"}</span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(conversation)}>
                        Read transcript
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <StaffFormModal
        open={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        businessId={businessId}
        staffMember={null}
        services={services}
        onSaved={() => {
          setStaffModalOpen(false);
          toast.success("Team member added");
          staffQuery.reload();
        }}
      />

      <ServiceFormModal
        open={serviceModalOpen}
        onClose={() => setServiceModalOpen(false)}
        businessId={businessId}
        service={null}
        onSaved={() => {
          setServiceModalOpen(false);
          toast.success("Service created");
          servicesQuery.reload();
        }}
      />

      <ConversationDetailModal
        conversation={selectedConversation}
        onClose={() => setSelectedConversation(null)}
      />

      <ConfirmDialog
        open={deleting}
        title="Delete this business?"
        message={`${business.name} and its tenant records will be permanently removed. The backend refuses while staff, services, appointments or conversations still reference it.`}
        confirmLabel="Delete business"
        isConfirming={removeBusiness.isPending}
        onConfirm={handleDeleteBusiness}
        onCancel={() => setDeleting(false)}
      />
    </>
  );
}
