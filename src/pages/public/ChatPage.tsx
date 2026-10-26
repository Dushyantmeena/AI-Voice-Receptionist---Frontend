import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  AudioLines,
  CalendarCheck2,
  Info,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { chatService } from "@/services/chatService";
import { getErrorMessage } from "@/api/apiError";
import { ToolResultCard } from "@/features/chat/ToolResultCard";
import { Button } from "@/components/ui/Button";
import { PATHS } from "@/routes/paths";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { ExecutedTool } from "@/types/domain";

interface ChatEntry {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  tools?: ExecutedTool[];
  intent?: string | null;
}

const SUGGESTIONS = [
  "What services do you offer?",
  "Do you have anything available this week?",
  "I'd like to book an appointment",
  "I need to cancel my appointment",
];

let entryCounter = 0;

function nextEntryId(): string {
  entryCounter += 1;
  return `entry-${Date.now()}-${entryCounter}`;
}

/**
 * The backend stores a readable transcript as
 * `Customer: …\nReceptionist: …` blocks. Multi-line replies are folded into the
 * previous entry so no assistant text is lost.
 */
function parseTranscript(transcript: string): Omit<ChatEntry, "id">[] {
  const entries: Omit<ChatEntry, "id">[] = [];

  for (const rawLine of transcript.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("Customer:")) {
      entries.push({ role: "user", content: line.slice("Customer:".length).trim() });
    } else if (line.startsWith("Receptionist:")) {
      entries.push({ role: "assistant", content: line.slice("Receptionist:".length).trim() });
    } else if (entries.length > 0) {
      const previous = entries[entries.length - 1];
      if (previous) {
        previous.content = `${previous.content}\n${line}`.trim();
      }
    }
  }

  return entries;
}

export default function ChatPage() {
  const { businessId = "" } = useParams<{ businessId: string }>();
  const [searchParams] = useSearchParams();
  const storageKey = businessId ? `avr.chat.conversation.${businessId}` : "";

  const [businessName, setBusinessName] = useState(() => searchParams.get("businessName") ?? "");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useDocumentTitle(businessName ? `${businessName} receptionist` : "AI receptionist");

  // Resume the stored session for this business, if one exists.
  useEffect(() => {
    if (!storageKey) return;
    const stored = window.sessionStorage.getItem(storageKey);
    if (!stored) return;

    let active = true;
    setIsRestoring(true);

    chatService
      .getConversation(businessId, stored)
      .then((conversation) => {
        if (!active) return;
        setConversationId(conversation.id);
        if (conversation.business?.name) {
          setBusinessName((current) => current || conversation.business?.name || "");
        }
        const restored = parseTranscript(conversation.transcript).map((entry) => ({
          ...entry,
          id: nextEntryId(),
        }));
        setEntries(restored);
      })
      .catch(() => {
        if (!active) return;
        window.sessionStorage.removeItem(storageKey);
      })
      .finally(() => {
        if (active) setIsRestoring(false);
      });

    return () => {
      active = false;
    };
  }, [businessId, storageKey]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [entries, isSending]);

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || isSending || !businessId) return;

      setDraft("");
      setEntries((current) => [...current, { id: nextEntryId(), role: "user", content: message }]);
      setIsSending(true);

      try {
        const turn = await chatService.send(businessId, {
          message,
          ...(conversationId ? { conversationId } : {}),
        });

        setConversationId(turn.conversationId);
        window.sessionStorage.setItem(storageKey, turn.conversationId);
        if (turn.businessName) setBusinessName(turn.businessName);

        setEntries((current) => [
          ...current,
          {
            id: nextEntryId(),
            role: "assistant",
            content: turn.response,
            tools: turn.executedTools,
            intent: turn.intent,
          },
        ]);
      } catch (cause) {
        setEntries((current) => [
          ...current,
          { id: nextEntryId(), role: "error", content: getErrorMessage(cause) },
        ]);
      } finally {
        setIsSending(false);
        inputRef.current?.focus();
      }
    },
    [businessId, conversationId, isSending, storageKey],
  );

  const startNewConversation = () => {
    if (storageKey) window.sessionStorage.removeItem(storageKey);
    setConversationId(null);
    setEntries([]);
    setDraft("");
    inputRef.current?.focus();
  };

  if (!businessId) {
    return (
      <div className="status-page">
        <div className="status-page__inner">
          <p className="status-page__code">404</p>
          <h1 className="status-page__title">No business selected</h1>
          <p className="status-page__text">
            A chat link needs a business reference. Ask the business for its link, or enter the ID on
            the home page.
          </p>
          <div className="status-page__actions">
            <Link className="btn btn--primary" to={PATHS.home}>
              Go to the home page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = businessName || "AI Receptionist";

  return (
    <div className="chat-page">
      <aside className="chat-rail">
        <div className="chat-rail__brand">
          <span className="chat-rail__logo" aria-hidden="true">
            <AudioLines size={19} />
          </span>
          <div>
            <p className="chat-rail__name">{displayName}</p>
            <p className="chat-rail__industry">AI receptionist</p>
          </div>
        </div>

        <div>
          <p className="chat-rail__section-title">What you can do here</p>
          <div className="chat-rail__list">
            <div className="chat-rail__item">
              <span>Browse services and prices</span>
              <Sparkles size={14} aria-hidden="true" />
            </div>
            <div className="chat-rail__item">
              <span>Find an open slot</span>
              <CalendarCheck2 size={14} aria-hidden="true" />
            </div>
            <div className="chat-rail__item">
              <span>Book, move or cancel</span>
              <RotateCcw size={14} aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="chat-rail__identity">
          <p className="chat-rail__section-title">Booking details</p>
          <p className="chat-rail__note">
            The agent collects a name and a 10-digit phone number only when a booking needs them. Your
            number is what ties the appointment to you.
          </p>
        </div>

        <div className="chat-rail__identity">
          <p className="chat-rail__section-title">How this works</p>
          <p className="chat-rail__note">
            This is a live AI receptionist connected to the business&apos;s real service catalogue,
            staff and appointment book. Confirmations you see here are written to the same calendar the
            team uses.
          </p>
        </div>

        <div style={{ marginTop: "auto" }}>
          <Link className="btn-link" to={PATHS.home}>
            <ArrowLeft size={14} />
            Back to the home page
          </Link>
        </div>
      </aside>

      <div className="chat-surface">
        <header className="chat-surface__header">
          <Link className="chat-back" to={PATHS.home} aria-label="Leave the conversation">
            <ArrowLeft size={18} />
          </Link>

          <div className="chat-surface__title">
            <p className="chat-surface__name">
              {displayName}
              <ShieldCheck size={14} color="#0f9d58" aria-hidden="true" />
            </p>
            <p className="chat-surface__status">
              <span className={isSending ? "status-dot status-dot--warning" : "status-dot status-dot--live"} aria-hidden="true" />
              {isSending ? "Receptionist is replying…" : isRestoring ? "Loading your conversation…" : "Online · replies in seconds"}
            </p>
          </div>

          <div className="chat-surface__spacer" />

          <Button
            variant="ghost"
            size="sm"
            onClick={startNewConversation}
            leadingIcon={<RotateCcw size={14} />}
            disabled={isSending || entries.length === 0}
          >
            New chat
          </Button>
        </header>

        <div className="chat-surface__messages" ref={messagesRef}>
          {entries.length === 0 && !isRestoring ? (
            <div className="tool-card tool-card--info">
              <div className="tool-card__head">
                <Info size={14} aria-hidden="true" />
                Start of conversation
              </div>
              <div className="tool-card__body">
                <p className="feature-card__title">Ask about services, times or an existing booking</p>
                <p className="feature-card__text">
                  This receptionist answers from the business&apos;s live records. Bookings made here are
                  real appointments — the team will see them immediately.
                </p>
              </div>
            </div>
          ) : null}

          {entries.map((entry) => {
            if (entry.role === "error") {
              return (
                <div className="msg" key={entry.id}>
                  <span className="msg__avatar msg__avatar--ai" aria-hidden="true">
                    !
                  </span>
                  <div className="msg__content">
                    <div className="msg__bubble msg__bubble--ai msg__bubble--error">{entry.content}</div>
                    <p className="msg__meta">That message did not go through. Try sending it again.</p>
                  </div>
                </div>
              );
            }

            const isUser = entry.role === "user";

            return (
              <div className={`msg${isUser ? " msg--user" : ""}`} key={entry.id}>
                <span
                  className={`msg__avatar msg__avatar--${isUser ? "user" : "ai"}`}
                  aria-hidden="true"
                >
                  {isUser ? "You" : <AudioLines size={14} />}
                </span>
                <div className="msg__content">
                  <div className={`msg__bubble msg__bubble--${isUser ? "user" : "ai"}`}>
                    {entry.content}
                  </div>
                  {entry.intent ? <p className="msg__meta">Detected intent · {entry.intent}</p> : null}
                  {entry.tools && entry.tools.length > 0 ? (
                    <div className="stack stack--tight" style={{ width: "100%" }}>
                      {entry.tools.map((tool) => (
                        <ToolResultCard
                          key={tool.toolCallId}
                          tool={tool}
                          onSuggestion={(message) => {
                            void send(message);
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {isSending ? (
            <div className="msg">
              <span className="msg__avatar msg__avatar--ai" aria-hidden="true">
                <AudioLines size={14} />
              </span>
              <div className="msg__content">
                <div className="typing" aria-label="Receptionist is typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="chat-surface__composer">
          {entries.length === 0 ? (
            <div className="chat-suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  type="button"
                  className="chat-suggestion"
                  key={suggestion}
                  onClick={() => {
                    void send(suggestion);
                  }}
                  disabled={isSending}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="chat-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <textarea
              ref={inputRef}
              className="chat-composer__input"
              value={draft}
              maxLength={1000}
              rows={1}
              placeholder="Type your message…"
              aria-label="Message to the AI receptionist"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send(draft);
                }
              }}
            />
            <Button
              type="submit"
              iconOnly
              aria-label="Send message"
              isLoading={isSending}
              disabled={!draft.trim() || isSending}
            >
              {isSending ? null : <Send size={16} />}
            </Button>
          </form>

          <p className="chat-composer__hint">
            Enter to send · Shift + Enter for a new line · Times are shown in your local timezone
          </p>
        </div>
      </div>
    </div>
  );
}
