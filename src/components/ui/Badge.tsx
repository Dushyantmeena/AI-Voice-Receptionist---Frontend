import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { initialsOf } from "@/utils/format";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_TONES,
  type BadgeTone,
} from "@/constants/domain";
import type { AppointmentStatus } from "@/types/domain";

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", dot = true, children, className }: BadgeProps) {
  return (
    <span className={cn("badge", `badge--${tone}`, !dot && "badge--no-dot", className)}>{children}</span>
  );
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge tone={APPOINTMENT_STATUS_TONES[status]}>{APPOINTMENT_STATUS_LABELS[status]}</Badge>
  );
}

interface AvatarProps {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  inverse?: boolean;
}

export function Avatar({ name, size = "md", inverse = false }: AvatarProps) {
  return (
    <span
      className={cn(
        "avatar",
        size === "md" ? undefined : `avatar--${size}`,
        inverse && "avatar--inverse",
      )}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
