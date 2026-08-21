/**
 * EmptyState — what a screen shows before there is data.
 *
 * Called by: every route in `src/routes/`.
 * Calls: nothing.
 *
 * §9.7 is blunt about this: an empty state tells the user what to do next, and
 * "No data" is never acceptable. The `action` prop is not optional in spirit
 * even though it is in the type — if you cannot name a next step, the empty
 * state is probably hiding a missing feature.
 */
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  /** A lucide icon component. Kept generic so callers pass `Inbox`, `Users`, … */
  icon?: React.ComponentType<{ className?: string }>;
  /** What is empty, in the user's words. */
  title: string;
  /** Why it is empty and what to do about it. */
  description: React.ReactNode;
  /** The next step, as a button or link. */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "mx-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && <Icon className="mb-3 h-6 w-6 text-muted-foreground" />}
      <h2 className="text-base font-medium">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
