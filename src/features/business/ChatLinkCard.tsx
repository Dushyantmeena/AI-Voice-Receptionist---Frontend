import { useState } from "react";
import { Check, Copy, ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PATHS } from "@/routes/paths";

interface ChatLinkCardProps {
  businessId: string;
  businessName?: string;
}

/**
 * The public entry point for customers.
 *
 * The backend resolves chats by business ID (there is no slug column), so this
 * link is the canonical way to hand a customer to the receptionist.
 */
export function ChatLinkCard({ businessId, businessName }: ChatLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${PATHS.chat(businessId)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="card card--padded chat-link">
      <div className="chat-link__head">
        <span className="chat-link__icon" aria-hidden="true">
          <Link2 size={16} />
        </span>
        <div>
          <p className="card__title">Your receptionist link</p>
          <p className="card__subtitle">
            {businessName ? `Customers chat with ${businessName}` : "Customers chat with your business"} —
            no app, no account.
          </p>
        </div>
      </div>

      <div className="chat-link__value">
        <code className="chat-link__code truncate">{url}</code>
      </div>

      <div className="chat-link__actions">
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={copied ? <Check size={14} /> : <Copy size={14} />}
          onClick={handleCopy}
        >
          {copied ? "Copied" : "Copy link"}
        </Button>
        <a className="btn btn--primary btn--sm" href={PATHS.chat(businessId)} target="_blank" rel="noreferrer">
          <ExternalLink size={14} />
          Preview chat
        </a>
      </div>

      <p className="chat-link__note">
        Bookings made through this link land in this calendar instantly, tagged with the customer's
        phone number.
      </p>
    </div>
  );
}
