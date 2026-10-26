import { cn } from "@/utils/cn";
import { parseTranscript } from "./transcript";

export function TranscriptView({
  transcript,
  className,
}: {
  transcript: string | null | undefined;
  className?: string;
}) {
  const entries = parseTranscript(transcript);

  if (entries.length === 0) {
    return <p className="text-sm text-muted">This session has no recorded transcript yet.</p>;
  }

  return (
    <div className={cn("transcript", className)}>
      {entries.map((entry, index) => (
        <div
          className={cn("msg", entry.role === "customer" && "msg--user")}
          key={`${entry.role}-${index}`}
        >
          <span
            className={cn("msg__avatar", entry.role === "customer" ? "msg__avatar--user" : "msg__avatar--ai")}
            aria-hidden="true"
          >
            {entry.role === "customer" ? "C" : "AI"}
          </span>
          <div className="msg__content">
            <div
              className={cn(
                "msg__bubble",
                entry.role === "customer" ? "msg__bubble--user" : "msg__bubble--ai",
              )}
            >
              {entry.content}
            </div>
            <span className="msg__meta">{entry.role === "customer" ? "Customer" : "Receptionist"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
