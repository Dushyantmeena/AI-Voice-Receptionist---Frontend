import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Replaces the leading icon with a spinner and blocks interaction. */
  isLoading?: boolean;
  block?: boolean;
  iconOnly?: boolean;
  leadingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    block = false,
    iconOnly = false,
    leadingIcon,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "btn",
        `btn--${variant}`,
        size === "md" ? undefined : `btn--${size}`,
        block ? "btn--block" : undefined,
        iconOnly ? "btn--icon" : undefined,
        className,
      )}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? <span className="btn__spinner" aria-hidden="true" /> : leadingIcon}
      {children}
    </button>
  );
});
