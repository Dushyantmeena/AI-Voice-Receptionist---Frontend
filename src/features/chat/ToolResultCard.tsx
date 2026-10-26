import { useState } from "react";
import {
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Copy,
  Check,
  Info,
  Users,
  XCircle,
} from "lucide-react";
import { formatCurrency, formatDateTimeRange } from "@/utils/format";
import { cn } from "@/utils/cn";
import type { ExecutedTool } from "@/types/domain";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(source: UnknownRecord, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumber(source: UnknownRecord, key: string): number | null {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const TOOL_TITLES: Record<string, string> = {
  get_business_info: "Business details",
  get_services: "Service catalogue",
  get_staff: "Team availability",
  check_availability: "Availability check",
  create_appointment: "Appointment booked",
  reschedule_appointment: "Appointment rescheduled",
  cancel_appointment: "Appointment cancelled",
  get_customer_appointments: "Customer appointments",
};

function CopyChip({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span className="tool-card__code">
      <span className="truncate">{value}</span>
      <button
        type="button"
        className="btn-link"
        onClick={handleCopy}
        aria-label={copied ? "Reference copied" : "Copy reference"}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="tool-card__row">
      <span className="tool-card__label">{label}</span>
      <span className="tool-card__value">{value}</span>
    </div>
  );
}

function AppointmentDetails({ appointment }: { appointment: UnknownRecord }) {
  const service = isRecord(appointment.service) ? readString(appointment.service, "name") : null;
  const staff = isRecord(appointment.staff) ? readString(appointment.staff, "name") : null;
  const start = readString(appointment, "startTime");
  const end = readString(appointment, "endTime");
  const status = readString(appointment, "status");
  const id = readString(appointment, "id");

  return (
    <>
      {service ? <Row label="Service" value={service} /> : null}
      {staff ? <Row label="Team member" value={staff} /> : null}
      {start ? <Row label="When" value={formatDateTimeRange(start, end)} /> : null}
      {status ? <Row label="Status" value={status.toLowerCase()} /> : null}
      {id ? <CopyChip value={id} /> : null}
    </>
  );
}

interface ToolResultCardProps {
  tool: ExecutedTool;
  /** Called when the customer taps a suggested slot. */
  onSuggestion?: (message: string) => void;
}

/**
 * Renders the structured result of an AI tool call.
 *
 * The shape of `result` is only known at runtime, so every access is guarded —
 * a change in the backend tool payload degrades to a plain card, never a crash.
 */
export function ToolResultCard({ tool, onSuggestion }: ToolResultCardProps) {
  const title = TOOL_TITLES[tool.name] ?? tool.name.replace(/_/g, " ");
  const result = tool.result;

  if (!tool.success) {
    const message = isRecord(result) ? (readString(result, "message") ?? readString(result, "error")) : null;
    return (
      <div className="tool-card tool-card--error">
        <div className="tool-card__head">
          <XCircle size={14} aria-hidden="true" />
          {title} · failed
        </div>
        <div className="tool-card__body">
          <p className="feature-card__text">{message ?? "The receptionist could not complete that action."}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "tool-card",
        tool.name === "check_availability" ? "tool-card--info" : "tool-card--success",
      )}
    >
      <div className="tool-card__head">
        <CheckCircle2 size={14} aria-hidden="true" />
        {title}
      </div>
      <div className="tool-card__body">
        <ToolResultBody toolName={tool.name} result={result} onSuggestion={onSuggestion} />
      </div>
    </div>
  );
}

function ToolResultBody({
  toolName,
  result,
  onSuggestion,
}: {
  toolName: string;
  result: unknown;
  onSuggestion?: (message: string) => void;
}) {
  switch (toolName) {
    case "get_services": {
      const services = asArray(result).filter(isRecord);
      if (services.length === 0) return <p className="feature-card__text">No services are listed yet.</p>;
      return (
        <div>
          <p className="feature-card__title">Services available</p>
          {services.slice(0, 6).map((service, index) => {
            const name = readString(service, "name") ?? "Service";
            const price = readString(service, "price");
            const duration = readNumber(service, "durationMinutes");
            return (
              <div className="chat-service" key={`${name}-${index}`}>
                <div>
                  <p className="chat-service__name">{name}</p>
                  <p className="chat-service__meta">{duration !== null ? `${duration} min` : "Duration on request"}</p>
                </div>
                <span className="chat-service__price">{price ? formatCurrency(price) : "—"}</span>
              </div>
            );
          })}
        </div>
      );
    }

    case "get_staff": {
      const staff = asArray(result).filter(isRecord);
      if (staff.length === 0) return <p className="feature-card__text">No team members matched.</p>;
      return (
        <div>
          <p className="feature-card__title">
            <Users size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: "-2px" }} />
            Team members
          </p>
          {staff.slice(0, 6).map((member, index) => (
            <div className="chat-service" key={`${readString(member, "id") ?? index}`}>
              <div>
                <p className="chat-service__name">{readString(member, "name") ?? "Team member"}</p>
                <p className="chat-service__meta">{readString(member, "role") ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    case "check_availability": {
      if (!isRecord(result)) return <p className="feature-card__text">Availability could not be read.</p>;
      const available = result.available === true;
      const reason = readString(result, "reason");
      const suggestions = asArray(result.suggestions).filter(isRecord);

      return (
        <div>
          <p className="feature-card__title">{available ? "That slot is free" : "That slot is taken"}</p>
          {reason ? <p className="feature-card__text">{reason}</p> : null}
          {suggestions.length > 0 ? (
            <>
              <p className="chat-service__meta" style={{ marginTop: 12 }}>
                Suggested alternatives
              </p>
              <div className="slot-chips">
                {suggestions.slice(0, 5).map((slot, index) => {
                  const start = readString(slot, "startTime");
                  const end = readString(slot, "endTime");
                  if (!start) return null;
                  const label = formatDateTimeRange(start, end);
                  return (
                    <button
                      key={`${start}-${index}`}
                      type="button"
                      className="slot-chip"
                      onClick={() => onSuggestion?.(`I'd like the slot on ${label}.`)}
                    >
                      <CalendarClock size={13} aria-hidden="true" />
                      {label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>
      );
    }

    case "create_appointment":
    case "reschedule_appointment":
    case "cancel_appointment": {
      if (!isRecord(result)) return <p className="feature-card__text">The appointment was updated.</p>;
      return (
        <div>
          <p className="feature-card__title">
            <CalendarCheck2 size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: "-2px" }} />
            {toolName === "cancel_appointment" ? "Cancellation confirmed" : "Booking confirmed"}
          </p>
          <div className="tool-card__rows">
            <AppointmentDetails appointment={result} />
          </div>
        </div>
      );
    }

    case "get_business_info": {
      const business = isRecord(result) && isRecord(result.business) ? result.business : null;
      if (!business) return null;
      return (
        <div>
          <p className="feature-card__title">{readString(business, "name") ?? "Business"}</p>
          <div className="tool-card__rows">
            {readString(business, "phone") ? <Row label="Phone" value={readString(business, "phone")!} /> : null}
            {readString(business, "email") ? <Row label="Email" value={readString(business, "email")!} /> : null}
            {readString(business, "address") ? <Row label="Address" value={readString(business, "address")!} /> : null}
            {readString(business, "industry") ? <Row label="Industry" value={readString(business, "industry")!} /> : null}
          </div>
        </div>
      );
    }

    case "get_customer_appointments": {
      const appointments = asArray(result).filter(isRecord);
      if (appointments.length === 0) {
        return <p className="feature-card__text">No appointments are attached to this customer yet.</p>;
      }
      return (
        <div>
          <p className="feature-card__title">Customer appointments</p>
          <div className="tool-card__rows">
            {appointments.slice(0, 3).map((appointment, index) => (
              <Row
                key={`${readString(appointment, "id") ?? index}`}
                label={readString(appointment, "status")?.toLowerCase() ?? "appointment"}
                value={formatDateTimeRange(
                  readString(appointment, "startTime"),
                  readString(appointment, "endTime"),
                )}
              />
            ))}
          </div>
        </div>
      );
    }

    default:
      return (
        <p className="feature-card__text">
          <Info size={13} aria-hidden="true" style={{ marginRight: 6, verticalAlign: "-2px" }} />
          The receptionist completed <strong>{toolName.replace(/_/g, " ")}</strong>.
        </p>
      );
  }
}
