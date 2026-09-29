/**
 * Presentational pieces used across the Graduation page: tab strip, stat
 * tiles, progress bar segments, legend, table header cells, callouts.
 */
import { motion } from "motion/react";
import { CalendarClock, ClipboardPaste, Flame, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type GradTab = "timeline" | "blocks" | "registrar" | "risk";

/** The CWA scenario-tab strip: bold label, letterspaced sub, spring
 *  underline via layoutId. One page, three questions. */
export function TabStrip({
  active,
  onChange,
  registrarBacked,
}: {
  active: GradTab;
  onChange: (t: GradTab) => void;
  registrarBacked: boolean;
}) {
  const tabs: { id: GradTab; label: string; sub: string; icon: React.ReactNode }[] = [
    {
      id: "timeline",
      label: "Timeline",
      sub: "What to take · which semester",
      icon: <CalendarClock className="h-3.5 w-3.5" />,
    },
    {
      id: "blocks",
      label: "Degree Blocks",
      sub: "Blocks · GPA · deadlines",
      icon: <Layers className="h-3.5 w-3.5" />,
    },
    {
      id: "registrar",
      label: "Registrar",
      sub: registrarBacked ? "MyProgress · what SJSU counts" : "Import MyProgress",
      icon: <ClipboardPaste className="h-3.5 w-3.5" />,
    },
    {
      id: "risk",
      label: "Risk & Rules",
      sub: "Critical path · pairing rules",
      icon: <Flame className="h-3.5 w-3.5" />,
    },
  ];
  return (
    <div className="px-10">
      <div className="flex items-stretch gap-0 border-b border-border">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={cn(
                "group relative px-6 py-3 text-left transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/85",
              )}
            >
              <div className="mb-0.5 flex items-center gap-2">
                <span className={isActive ? "text-brand-fg" : "text-muted-foreground/70"}>
                  {t.icon}
                </span>
                <span className="text-sm font-bold tracking-tight">{t.label}</span>
              </div>
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                {t.sub}
              </div>
              {isActive && (
                <motion.div
                  layoutId="grad-tab-underline"
                  className="absolute -bottom-px left-0 right-0 h-[2px] bg-brand"
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "critical" | "onTrack";
}) {
  return (
    <div className="px-5 py-4">
      <div className="text-2xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        data-numeric
        className={cn(
          "mt-1 font-mono text-[26px] font-bold leading-none tabular-nums tracking-tight",
          accent === "critical" && "text-critical-fg",
          accent === "onTrack" && "text-on-track-fg",
        )}
      >
        {value}
      </div>
      <div className="mt-1 truncate text-2xs text-muted-foreground" title={sub}>
        {sub}
      </div>
    </div>
  );
}

export function Segment({ pct, n, cls, delay }: { pct: number; n: number; cls: string; delay: number }) {
  if (pct <= 0) return null;
  return (
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${pct}%` }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      className={cn("flex h-full items-center justify-center", cls)}
    >
      {pct > 5 && (
        <span data-numeric className="text-sm font-bold tabular-nums">
          {n}
        </span>
      )}
    </motion.div>
  );
}

export function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", cls)} />
      {label}
    </span>
  );
}

export function Th({
  children,
  right,
  className,
}: {
  children: React.ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
        right && "text-right",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Callout({
  tone,
  icon: Icon,
  title,
  body,
}: {
  tone: "critical" | "at-risk";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 border-l-[3px] py-1 pl-4",
        tone === "critical" ? "border-critical/60" : "border-at-risk/60",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          tone === "critical" ? "text-critical-fg" : "text-at-risk-fg",
        )}
      />
      <div>
        <p
          className={cn(
            "text-sm font-medium",
            tone === "critical" ? "text-critical-fg" : "text-at-risk-fg",
          )}
        >
          {title}
        </p>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
