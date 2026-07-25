import { cn } from "@/lib/utils";

interface SpinnerProps {
  /** Diameter in px. 18 sits comfortably inline with 14-16px button text. */
  size?: number;
  className?: string;
  /** Announced to screen readers; pass the action, e.g. "Logging in". */
  label?: string;
}

/**
 * Circular progress indicator. Draws in `currentColor`, so it picks up the
 * colour of whatever it sits in (white on the primary buttons, orange on
 * light surfaces).
 */
export default function Spinner({
  size = 18,
  className,
  label = "Loading",
}: SpinnerProps) {
  return (
    <svg
      className={cn("animate-spin shrink-0", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label={label}
    >
      {/* track */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeOpacity="0.25"
      />
      {/* moving arc */}
      <path
        d="M21.5 12A9.5 9.5 0 0 0 12 2.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Spinner + label for use inside a submitting button. Keeps the button's text
 * baseline and height stable while it's disabled.
 */
export function ButtonSpinner({
  children,
  size = 18,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <span className="flex items-center justify-center gap-2">
      <Spinner size={size} label={typeof children === "string" ? children : "Loading"} />
      <span>{children}</span>
    </span>
  );
}
