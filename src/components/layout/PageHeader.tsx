/**
 * PageHeader: the one header every Study tool page uses (readiness, oral
 * practice, lectures, mistake log), so they share one title size, one
 * back-link style and the same spacing.
 *
 * Called by: routes/StudyReady, StudyOral, StudyLectures, StudyMistakes.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  back,
  icon: Icon,
  iconClass = "text-brand-fg",
  title,
  children,
  actions,
}: {
  back: { to: string; label: string };
  icon: LucideIcon;
  iconClass?: string;
  title: ReactNode;
  /** The one or two sentences under the title. */
  children?: ReactNode;
  /** Buttons on the right, level with the title. */
  actions?: ReactNode;
}) {
  return (
    <header>
      <Link to={back.to} className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> {back.label}
      </Link>
      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
            <Icon className={cn("h-5 w-5 shrink-0", iconClass)} /> {title}
          </h1>
          {children && <div className="mt-1 max-w-[80ch] text-sm leading-relaxed text-muted-foreground">{children}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
