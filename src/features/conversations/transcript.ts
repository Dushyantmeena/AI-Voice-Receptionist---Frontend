export interface TranscriptEntry {
  role: "customer" | "agent";
  content: string;
}

/**
 * The backend stores each AI session as a plain transcript:
 * `Customer: …\nReceptionist: …`. Continuation lines belong to the entry above
 * them, so they are folded back in rather than rendered as a new turn.
 */
export function parseTranscript(transcript: string | null | undefined): TranscriptEntry[] {
  if (!transcript) return [];

  const entries: TranscriptEntry[] = [];

  for (const rawLine of transcript.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("Customer:")) {
      entries.push({ role: "customer", content: line.slice("Customer:".length).trim() });
    } else if (line.startsWith("Receptionist:")) {
      entries.push({ role: "agent", content: line.slice("Receptionist:".length).trim() });
    } else {
      const previous = entries[entries.length - 1];
      if (previous) {
        previous.content = `${previous.content}\n${line}`.trim();
      } else {
        entries.push({ role: "agent", content: line });
      }
    }
  }

  return entries;
}
