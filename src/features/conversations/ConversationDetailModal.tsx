import { Building2, CalendarClock, Phone, Sparkles, UserRound } from "lucide-react";
import type { Conversation } from "@/types/domain";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Feedback";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, formatRelative } from "@/utils/format";
import { ToolResultCard } from "@/features/chat/ToolResultCard";
import { TranscriptView } from "./TranscriptView";

interface ConversationDetailModalProps {
  conversation: Conversation | null;
  onClose: () => void;
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="conversation-meta__item">
      <span className="conversation-meta__icon" aria-hidden="true">
        <Icon size={15} />
      </span>
      <div>
        <p className="conversation-meta__label">{label}</p>
        <p className="conversation-meta__value">{value}</p>
      </div>
    </div>
  );
}

/**
 * Read-only view of a stored AI session: the transcript the agent wrote,
 * the detected intent and the tools that actually executed.
 */
export function ConversationDetailModal({ conversation, onClose }: ConversationDetailModalProps) {
  if (!conversation) return null;

  const tools = conversation.metadata?.lastToolExecutions ?? [];
  const customerName = conversation.customer?.name ?? "Unidentified customer";
  const customerPhone = conversation.customer?.phone;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Conversation transcript"
      description={`Session ${conversation.id} · started ${formatRelative(conversation.createdAt)}`}
    >
      <div className="stack stack--loose">
        <div className="conversation-meta">
          <MetaRow icon={UserRound} label="Customer" value={customerName} />
          {customerPhone ? <MetaRow icon={Phone} label="Phone" value={customerPhone} /> : null}
          <MetaRow
            icon={Building2}
            label="Business"
            value={conversation.business?.name ?? conversation.businessId}
          />
          <MetaRow
            icon={CalendarClock}
            label="Last activity"
            value={formatDateTime(conversation.updatedAt)}
          />
        </div>

        <div className="row row--wrap">
          <Badge tone={conversation.intent ? "brand" : "neutral"} dot={false}>
            <Sparkles size={12} aria-hidden="true" />
            {conversation.intent ?? "No intent detected"}
          </Badge>
          {conversation.customerId ? null : (
            <Badge tone="warning" dot={false}>
              No customer attached
            </Badge>
          )}
        </div>

        <div>
          <p className="section__title">Transcript</p>
          <div className="transcript-panel">
            <TranscriptView transcript={conversation.transcript} />
          </div>
        </div>

        <div>
          <p className="section__title">Tools executed in the last turn</p>
          {tools.length === 0 ? (
            <Alert tone="info">
              This session did not call any tools — the receptionist answered from its prompt only.
            </Alert>
          ) : (
            <div className="stack">
              {tools.map((tool) => (
                <ToolResultCard key={tool.toolCallId || tool.name} tool={tool} />
              ))}
            </div>
          )}
        </div>

        {conversation.response ? (
          <div>
            <p className="section__title">Last agent reply</p>
            <p className="transcript-reply">{conversation.response}</p>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
