/**
 * ScreenHeader — the title block at the top of each screen.
 *
 * Called by: every route in `src/routes/`.
 * Calls: nothing.
 *
 * Exists so the four screens cannot drift apart on spacing or type. §9.2
 * reserves the display face for screen titles and course names; this is one of
 * the two places it is allowed to appear.
 */
import { cn } from "@/lib/utils";

export interface ScreenHeaderProps {
  title: string;
  /** One line, lowercase-ish, explaining what the screen is for. Optional. */
  subtitle?: string;
  /** Right-aligned controls — filters, an export button. */
  actions?: React.ReactNode;
  className?: string;
}

export function ScreenHeader({ title, subtitle, actions, className }: ScreenHeaderProps) {
  return (
    <div className={cn("flex items-start gap-4 px-6 pb-4 pt-6", className)}>
      <div className="min-w-0">
        <h1 className="truncate font-display text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
