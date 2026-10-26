import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar, Badge, StatusBadge } from "@/components/ui/Badge";

describe("StatusBadge", () => {
  it("renders the human label for each appointment status", () => {
    render(<StatusBadge status="NO_SHOW" />);
    expect(screen.getByText("No show")).toBeInTheDocument();
    expect(screen.getByText("No show")).toHaveClass("badge--warning");
  });

  it("uses the success tone for completed appointments", () => {
    render(<StatusBadge status="COMPLETED" />);
    expect(screen.getByText("Completed")).toHaveClass("badge--success");
  });
});

describe("Badge", () => {
  it("can render without a dot marker", () => {
    render(<Badge tone="brand" dot={false}>Super Admin</Badge>);
    const badge = screen.getByText("Super Admin");
    expect(badge).toHaveClass("badge--brand");
    expect(badge).toHaveClass("badge--no-dot");
  });
});

describe("Avatar", () => {
  it("renders the initials of the given name", () => {
    render(<Avatar name="Aarav Sharma" />);
    expect(screen.getByText("AS")).toBeInTheDocument();
  });
});
