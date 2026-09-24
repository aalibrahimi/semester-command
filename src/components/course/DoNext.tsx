/**
 * DoNext: the rows and section labels of a "Do next" list, shared by Today
 * and the course page's Overview tab so both read the same way: a course
 * color bar, the title, one line of context, a status badge, one action.
 */
import { Link } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type RowKind = "missing" | "soon" | "todo" | "study";

const BADGE: Record<RowKind, { label: string; cls: string }> = {
  missing: { label: "Missing", cls: "bg-critical/[0.12] text-critical-fg" },
  soon: { label: "Due soon", cls: "bg-at-risk/15 text-at-risk-fg" },
  todo: { label: "To do", cls: "bg-brand/10 text-brand-fg" },
  study: { label: "Study", cls: "bg-[hsl(262_60%_60%/0.14)] text-[hsl(262_45%_45%)] dark:text-[hsl(262_70%_78%)]" },
};

export function DoNextRow({
  color,
  title,
  sub,
  kind,
  onOpen,
  to,
  cta,
  onDone,
}: {
  color: string;
  title: string;
  sub: string;
  kind: RowKind;
  onOpen?: () => void;
  to?: string;
  cta: string;
  /** Optional local "mark done" check, shown on hover. */
  onDone?: () => void;
}) {
  const body = (
    <>
      <span aria-hidden className="w-1 self-stretch rounded-full" style={{ backgroundColor: color }} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14.5px] font-medium leading-snug">{title}</span>
        <span className="text-[12.5px] text-muted-foreground">{sub}</span>
      </span>
      <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold", BADGE[kind].cls)}>{BADGE[kind].label}</span>
      <span className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border px-3 text-[12.5px] font-medium text-foreground transition-colors duration-micro group-hover:bg-fill-ghost">
        {cta}
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </span>
    </>
  );
  const cls = "group flex min-w-0 flex-1 items-center gap-3.5 px-1 py-3 text-left";
  return (
    <div className="flex items-center border-t border-border/50">
      {to ? (
        <Link to={to} className={cls}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onOpen} className={cls}>
          {body}
        </button>
      )}
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          title="Mark done (only in this app)"
          aria-label="Mark done"
          className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground/60 transition-colors duration-micro hover:bg-on-track/15 hover:text-on-track-fg"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function DoNextLabel({ children, tone }: { children: string; tone: RowKind }) {
  const cls =
    tone === "missing"
      ? "text-critical-fg"
      : tone === "soon"
        ? "text-at-risk-fg"
        : tone === "study"
          ? "text-[hsl(262_45%_45%)] dark:text-[hsl(262_70%_78%)]"
          : "text-brand-fg";
  return <div className={cn("px-1 pb-0.5 pt-4 text-[11.5px] font-semibold uppercase tracking-wider", cls)}>{children}</div>;
}
