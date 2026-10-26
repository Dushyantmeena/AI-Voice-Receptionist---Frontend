import { describe, expect, it } from "vitest";
import { parseTranscript } from "@/features/conversations/transcript";

describe("parseTranscript", () => {
  it("splits the backend transcript format into turns", () => {
    const transcript = [
      "Customer: Hi, I need a haircut",
      "Receptionist: Of course. When would you like to come in?",
      "Customer: Tomorrow morning",
      "Receptionist: I have 10:00 and 11:30 available.",
    ].join("\n");

    expect(parseTranscript(transcript)).toEqual([
      { role: "customer", content: "Hi, I need a haircut" },
      { role: "agent", content: "Of course. When would you like to come in?" },
      { role: "customer", content: "Tomorrow morning" },
      { role: "agent", content: "I have 10:00 and 11:30 available." },
    ]);
  });

  it("folds continuation lines into the previous turn", () => {
    const transcript = "Customer: Hello\nReceptionist: Booking confirmed.\nReference AVR-1245.\nThank you!";

    expect(parseTranscript(transcript)).toEqual([
      { role: "customer", content: "Hello" },
      { role: "agent", content: "Booking confirmed.\nReference AVR-1245.\nThank you!" },
    ]);
  });

  it("treats an untagged opening line as the receptionist", () => {
    expect(parseTranscript("Welcome to Bloom Studio.")).toEqual([
      { role: "agent", content: "Welcome to Bloom Studio." },
    ]);
  });

  it("returns nothing for empty input", () => {
    expect(parseTranscript(null)).toEqual([]);
    expect(parseTranscript("   \n  ")).toEqual([]);
  });
});
