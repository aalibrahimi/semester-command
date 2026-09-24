/**
 * EmailProfessor: write an email to a professor in the app, then send it
 * from your own SJSU Gmail.
 *
 * Called by: routes/Inbox.tsx (the "Email a professor" button, and
 * /inbox?compose=<courseId> links from course pages).
 * Calls: useCourses, triage rows (for the missing-work template),
 * lib/syllabusDigest and the instructor list for addresses, the opener
 * plugin to open Gmail.
 *
 * # Why a Gmail compose link, not the Gmail API
 * The API needs a Google Cloud project, OAuth consent, and SJSU's Google
 * Workspace allowing an unverified third-party app to send as @sjsu.edu.
 * A compose link needs none of that: it opens Gmail's own compose window,
 * already filled in, in the SJSU account you're signed into. You read it
 * and press Send yourself, and it lands in your real Sent folder. Nothing
 * is sent from inside this app, so nothing can go out by accident.
 * "Open in Mail app" (mailto:) and "Copy" cover the cases where Gmail
 * isn't the right place.
 */
import { useEffect, useMemo, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Copy, ExternalLink, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCourses } from "@/hooks/useCourses";
import { useAuth } from "@/hooks/useAuth";
import { IS_TAURI, listInstructors, triageRows } from "@/lib/ipc";
import { courseHsla } from "@/lib/courseColor";
import { courseShort, parseCourseLabel } from "@/lib/courseLabel";
import { digestFor } from "@/lib/syllabusDigest";
import { firstNameOf } from "@/lib/briefing";
import { cn } from "@/lib/utils";
import type { CourseSummary, InstructorRow, TriageRow } from "@/types";

/** The account Gmail should open in, remembered per viewer. */
const FROM_KEY = "email-from";

type TemplateId = "question" | "missing" | "meeting" | "absence" | "blank";
const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: "question", label: "Question about an assignment" },
  { id: "missing", label: "Missing or late work" },
  { id: "meeting", label: "Ask to meet" },
  { id: "absence", label: "Missing class" },
  { id: "blank", label: "Blank" },
];

interface Prof {
  course: CourseSummary;
  code: string;
  name: string | null;
  email: string | null;
}

function lastName(full: string | null): string {
  if (!full) return "";
  const parts = full.replace(/^(dr\.?|prof\.?|professor)\s+/i, "").trim().split(/\s+/);
  return parts[parts.length - 1] ?? "";
}

function draft(t: TemplateId, p: Prof | undefined, me: string | null, item: TriageRow | undefined): { subject: string; body: string } {
  const code = p?.code ?? "";
  const hello = p?.name ? `Hello Professor ${lastName(p.name)},` : "Hello Professor,";
  const sign = `Thank you,\n${me ?? "[Your name]"}\n${code ? `${code} student` : ""}`.trim();
  const what = item?.name ?? "[assignment name]";
  switch (t) {
    case "question":
      return {
        subject: `${code}: question about ${what}`,
        body: `${hello}\n\nI have a question about ${what}. [Your question.]\n\n${sign}`,
      };
    case "missing":
      return {
        subject: `${code}: ${what}`,
        body: `${hello}\n\nI missed the deadline for ${what}. [One sentence on why, if you want to share it.] Is it still possible to turn it in late, and if so, is there a penalty I should expect?\n\n${sign}`,
      };
    case "meeting":
      return {
        subject: `${code}: meeting request`,
        body: `${hello}\n\nCould I meet with you during office hours or at another time that works for you? I'd like to go over [topic].\n\n${sign}`,
      };
    case "absence":
      return {
        subject: `${code}: missing class on [date]`,
        body: `${hello}\n\nI won't be able to attend class on [date] because [reason]. I'll catch up on what I miss. Is there anything I should turn in or prepare?\n\n${sign}`,
      };
    default:
      return { subject: code ? `${code}: ` : "", body: `${hello}\n\n\n\n${sign}` };
  }
}

export function EmailProfessorDialog({
  open,
  onOpenChange,
  initialCourseId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCourseId?: string | null;
}) {
  const { courses } = useCourses();
  const { status: auth } = useAuth();
  const [instructors, setInstructors] = useState<InstructorRow[]>([]);
  const [rows, setRows] = useState<TriageRow[]>([]);
  const [courseId, setCourseId] = useState<string>("");
  const [template, setTemplate] = useState<TemplateId>("question");
  const [itemId, setItemId] = useState<string>("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [from, setFrom] = useState(() => {
    try {
      return localStorage.getItem(FROM_KEY) ?? "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    if (!open) return;
    listInstructors().then(setInstructors).catch(() => {});
    triageRows().then(setRows).catch(() => {});
  }, [open]);

  const profs: Prof[] = useMemo(
    () =>
      courses
        .filter((c) => !c.hidden && c.gradeable)
        .map((c) => {
          const code = parseCourseLabel(c.courseCode ?? c.name).code ?? courseShort(c.courseCode ?? c.name);
          const digest = digestFor(parseCourseLabel(c.courseCode ?? c.name).code);
          const mine = instructors.filter((i) => i.courseId === c.id);
          const teacher = mine.find((i) => i.starred) ?? mine.find((i) => i.role === "teacher");
          return {
            course: c,
            code,
            name: digest?.instructor ?? teacher?.name ?? null,
            email: digest?.email ?? teacher?.email ?? null,
          };
        }),
    [courses, instructors],
  );

  // Pick the course the dialog was opened for (or the first) each time it opens.
  useEffect(() => {
    if (!open) return;
    const start = profs.find((p) => p.course.id === initialCourseId) ?? profs[0];
    if (start) setCourseId(start.course.id);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [open, initialCourseId, profs.length]);

  const prof = profs.find((p) => p.course.id === courseId);
  const courseItems = rows.filter((r) => r.courseId === courseId);
  const item = courseItems.find((r) => r.assignmentId === itemId);
  const me = auth.validatedAs;

  // Rewrite the draft whenever what it depends on changes.
  useEffect(() => {
    if (!prof) return;
    const d = draft(template, prof, me, item);
    setTo(prof.email ?? "");
    setSubject(d.subject);
    setBody(d.body);
  }, [prof, template, item, me]);

  const saveFrom = (v: string) => {
    setFrom(v);
    try {
      localStorage.setItem(FROM_KEY, v.trim());
    } catch {
      /* per-viewer convenience */
    }
  };

  const gmailUrl = () => {
    const q = new URLSearchParams({ view: "cm", fs: "1", to, su: subject, body });
    if (from.trim()) q.set("authuser", from.trim());
    return `https://mail.google.com/mail/?${q.toString()}`;
  };
  const mailtoUrl = () => `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const open_ = (url: string) => {
    if (IS_TAURI) void openUrl(url);
    else window.open(url, "_blank", "noopener");
  };
  const ready = to.includes("@") && subject.trim().length > 0;
  const bracket = /\[[^\]]+\]/.test(subject + body);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Email a professor</DialogTitle>
          <DialogDescription>
            Write it here, then send it from your SJSU Gmail. Gmail opens with everything filled in; you press Send there.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Course picker as chips: the course color, code, professor. */}
          <div className="flex flex-wrap gap-2">
            {profs.map((p) => (
              <button
                key={p.course.id}
                type="button"
                onClick={() => {
                  setCourseId(p.course.id);
                  setItemId("");
                }}
                aria-pressed={p.course.id === courseId}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-micro",
                  p.course.id === courseId ? "border-transparent text-foreground shadow-card" : "border-border text-muted-foreground hover:text-foreground",
                )}
                style={p.course.id === courseId ? { backgroundColor: courseHsla(p.course.id, 0.16) } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: courseHsla(p.course.id, 0.95) }} />
                {p.code}
                {p.name && <span className="text-muted-foreground">· {lastName(p.name)}</span>}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              What it's about
              <Select value={template} onValueChange={(v) => setTemplate(v as TemplateId)}>
                <SelectTrigger className="h-9 text-sm text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            {(template === "question" || template === "missing") && (
              <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Which assignment
                <Select value={itemId || "none"} onValueChange={(v) => setItemId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9 text-sm text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Type it myself</SelectItem>
                    {courseItems.map((r) => (
                      <SelectItem key={r.assignmentId} value={r.assignmentId}>
                        {r.name ?? "Untitled"}
                        {r.state !== "open" ? " (missing)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            )}
          </div>

          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            To
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="professor@sjsu.edu"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {prof && !prof.email && <span className="font-normal text-at-risk-fg">No address on file for this course; type it from the syllabus.</span>}
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Subject
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Message
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {bracket && <p className="text-xs text-at-risk-fg">Fill in the parts in [brackets] before sending.</p>}

          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Your SJSU Gmail (so Gmail opens in the right account)
            <input
              value={from}
              onChange={(e) => saveFrom(e.target.value)}
              placeholder={me ? `${(firstNameOf(me) ?? "first").toLowerCase()}.lastname@sjsu.edu` : "you@sjsu.edu"}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button disabled={!ready} onClick={() => open_(gmailUrl())}>
              <ExternalLink className="mr-1.5 h-4 w-4" /> Open in Gmail
            </Button>
            <Button variant="outline" disabled={!ready} onClick={() => open_(mailtoUrl())}>
              <Mail className="mr-1.5 h-4 w-4" /> Open in Mail app
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                void navigator.clipboard
                  .writeText(`To: ${to}\nSubject: ${subject}\n\n${body}`)
                  .then(() => toast.success("Copied the email."))
                  .catch(() => toast.error("Could not copy."));
              }}
            >
              <Copy className="mr-1.5 h-4 w-4" /> Copy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
