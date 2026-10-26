import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Contact } from "lucide-react";
import type { Customer } from "@/types/domain";
import { customerService } from "@/services/customerService";
import { getErrorMessage } from "@/api/apiError";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Field, Input } from "@/components/ui/Field";
import { useAsyncAction } from "@/hooks/useAsyncAction";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(255),
  phone: z.string().trim().min(5, "Enter a phone number").max(50),
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: "Enter a valid email address",
    }),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSaved: () => void;
}

export function CustomerFormModal({ open, onClose, customer, onSaved }: CustomerFormModalProps) {
  const isEditing = Boolean(customer);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", email: "" },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
    });
  }, [customer, open, reset]);

  const save = useAsyncAction(async (values: CustomerFormValues) => {
    const body = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      email: values.email?.trim() ? values.email.trim() : null,
    };

    return customer
      ? customerService.update(customer.id, body)
      : customerService.create(body);
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
      title={isEditing ? "Edit customer" : "New customer"}
      description={
        isEditing
          ? "Corrections here also apply to appointments already linked to this customer."
          : "Add someone who books by phone or in person."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="customer-form"
            isLoading={save.isPending}
            leadingIcon={<Contact size={16} />}
          >
            {isEditing ? "Save changes" : "Create customer"}
          </Button>
        </>
      }
    >
      <form id="customer-form" className="stack" onSubmit={onSubmit} noValidate>
        {save.error ? <Alert tone="error">{getErrorMessage(save.error)}</Alert> : null}

        <Field label="Full name" htmlFor="customer-name" required error={errors.name?.message}>
          <Input id="customer-name" invalid={Boolean(errors.name)} {...register("name")} />
        </Field>

        <Field
          label="Phone"
          htmlFor="customer-phone"
          required
          error={errors.phone?.message}
          hint="The phone number is the identity the AI receptionist uses to find returning customers."
        >
          <Input id="customer-phone" type="tel" invalid={Boolean(errors.phone)} {...register("phone")} />
        </Field>

        <Field label="Email" htmlFor="customer-email" error={errors.email?.message}>
          <Input id="customer-email" type="email" {...register("email")} />
        </Field>

        <Alert tone="info">
          Customer records are shared at platform level by the backend — they are not isolated per
          business. Only store details you are allowed to hold.
        </Alert>
      </form>
    </Modal>
  );
}
