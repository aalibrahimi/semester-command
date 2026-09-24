/**
 * EmailComposer: write an email in the app, to a professor, a classmate or
 * anyone, then send it from your own Gmail.
 *
 * Called by: routes/Inbox.tsx (the "New email" button, and
 * /inbox?compose=<courseId> links from course pages, which start with that
 * course's professor filled in).
 * Calls: useCourses, triage rows (for the assignment picker),
 * lib/syllabusDigest and the instructor list for professor addresses, the
 * opener plugin to open Gmail.
 *
 * # Who you can write to
 * - Professors: one click, addresses from the syllabus digests.
 * - Anyone else (classmates, personal addresses): type the address. Canvas
 *   hides classmates' emails from students, so the app can't look them up;
 *   instead it remembers every address you send to, with an optional name
 *   and course, and offers it again next time (the Contacts row). Saved
 *   contacts live in this app's local storage only.
 *
 * # How it sends: a Gmail compose link, not the Gmail API
 * The API needs a Google Cloud project, OAuth consent, and SJSU's Google
 * Workspace allowing an unverified app to send as @sjsu.edu. A compose link
 * needs none of that: Gmail's own compose window opens already filled in,
 * in the account you choose; you press Send there, and it lands in your
 * real Sent folder. Nothing is sent from inside this app. "Open in Mail
 * app" (mailto:) and "Copy" cover everything else.
 */
import { useEffect, useMemo, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Copy, ExternalLink, Mail, Plus, Send, X } from "lucide-react";
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
import type { InstructorRow, TriageRow } from "@/types";

/** The account Gmail should open in, remembered per viewer. */
const FROM_KEY = "email-from";
/** People you've emailed who aren't professors: [{ name, email, courseId }]. */
const CONTACTS_KEY = "email-contacts";

interface Person {
  email: string;
  name: string | null;
  /** Course this person belongs to, if any (a professor's course, a classmate's class). */
  courseId: string | null;
  professor: boolean;
}

function loadContacts(): Person[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CONTACTS_KEY) ?? "[]") as Person[];
    return Array.isArray(raw) ? raw.filter((p) => typeof p?.email === "string").map((p) => ({ ...p, professor: false })) : [];
  } catch {
    return [];
  }
}
function saveContacts(list: Person[]) {
  try {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(list.map(({ email, name, courseId }) => ({ email, name, courseId }))));
  } catch {
    /* per-viewer convenience */
  }
}

const EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

/** "Name <a@b.c>" or "a@b.c" → a person, else null. */
function parseAddress(raw: string): { email: string; name: string | null } | null {
  const s = raw.trim().replace(/[,;]+$/, "");
  const m = s.match(/^(.*)<([^>]+)>$/);
  const email = (m ? m[2] : s).trim().toLowerCase();
  const name = m ? m[1].trim().replace(/^"|"$/g, "") || null : null;
  return EMAIL_RE.test(email) ? { email, name } : null;
}

function lastName(full: string | null): string {
  if (!full) return "";
  const parts = full.replace(/^(dr\.?|prof\.?|professor)\s+/i, "").trim().split(/\s+/);
  return parts[parts.length - 1] ?? "";
}

type TemplateId = "question" | "missing" | "meeting" | "absence" | "group" | "notes" | "hello" | "blank";
const PROF_TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: "question", label: "Question about an assignment" },
  { id: "missing", label: "Missing or late work" },
  { id: "meeting", label: "Ask to meet" },
  { id: "absence", label: "Missing class" },
  { id: "blank", label: "Blank" },
];
const PEER_TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: "hello", label: "Quick message" },
  { id: "group", label: "Study group" },
  { id: "notes", label: "Ask for notes or help" },
  { id: "question", label: "Question about an assignment" },
  { id: "blank", label: "Blank" },
];

function draft(
  t: TemplateId,
  to: Person[],
  code: string,
  me: string | null,
  item: TriageRow | undefined,
): { subject: string; body: string } {
  const prof = to.find((p) => p.professor);
  const others = to.filter((p) => !p.professor);
  const hello = prof
    ? `Hello Professor ${lastName(prof.name)}`.trim() + ","
    : others.length === 1 && others[0].name
      ? `Hi ${others[0].name.split(" ")[0]},`
      : others.length > 1
        ? "Hi everyone,"
        : "Hi,";
  const myFirst = firstNameOf(me) ?? "[Your name]";
  const sign = prof ? `Thank you,\n${me ?? "[Your name]"}${code ? `\n${code} student` : ""}` : `Thanks,\n${myFirst}`;
  const pre = code ? `${code}: ` : "";
  const what = item?.name ?? "[assignment name]";
  switch (t) {
    case "question":
      return { subject: `${pre}question about ${what}`, body: `${hello}\n\nI have a question about ${what}. [Your question.]\n\n${sign}` };
    case "missing":
      return {
        subject: `${pre}${what}`,
        body: `${hello}\n\nI missed the deadline for ${what}. [One sentence on why, if you want to share it.] Is it still possible to turn it in late, and if so, is there a penalty I should expect?\n\n${sign}`,
      };
    case "meeting":
      return { subject: `${pre}meeting request`, body: `${hello}\n\nCould I meet with you during office hours or at another time that works for you? I'd like to go over [topic].\n\n${sign}` };
    case "absence":
      return {
        subject: `${pre}missing class on [date]`,
        body: `${hello}\n\nI won't be able to attend class on [date] because [reason]. I'll catch up on what I miss. Is there anything I should turn in or prepare?\n\n${sign}`,
      };
    case "group":
      return {
        subject: `${pre}study group?`,
        body: `${hello}\n\nWant to study together for ${code || "[class]"}${item ? ` (${item.name})` : ""}? I'm free [days and times]. We could meet at [place] or on Zoom.\n\n${sign}`,
      };
    case "notes":
      return {
        subject: `${pre}notes from [date]`,
        body: `${hello}\n\nI missed [what] in ${code || "class"}. Could you share your notes, or tell me what was covered? Happy to return the favor.\n\n${sign}`,
      };
    case "hello":
      return { subject: pre, body: `${hello}\n\n\n\n${sign}` };
    default:
      return { subject: pre, body: `${hello}\n\n\n\n${sign}` };
  }
}

/** One recipient line (To or Cc): chips plus a free-typing input. */
function RecipientField({
  label,
  people,
  onAdd,
  onRemove,
  suggestions,
}: {
  label: string;
  people: Person[];
  onAdd: (p: Person) => void;
  onRemove: (email: string) => void;
  suggestions: Person[];
}) {
  const [text, setText] = useState("");
  const q = text.trim().toLowerCase();
  const matches = q ? suggestions.filter((p) => !people.some((x) => x.email === p.email) && (p.email.includes(q) || (p.name ?? "").toLowerCase().includes(q))).slice(0, 5) : [];
  const commit = () => {
    const parsed = parseAddress(text);
    if (!parsed) return false;
    const known = suggestions.find((p) => p.email === parsed.email);
    onAdd(known ?? { ...parsed, courseId: null, professor: false });
    setText("");
    return true;
  };
  return (
    <div className="relative flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1 focus-within:ring-2 focus-within:ring-ring">
        {people.map((p) => (
          <span key={p.email} className="flex items-center gap-1 rounded-full bg-fill-ghost py-0.5 pl-2.5 pr-1 text-xs text-foreground">
            {p.courseId && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: courseHsla(p.courseId, 0.95) }} />}
            {p.name ? `${p.name}` : p.email}
            {p.name && <span className="text-muted-foreground">{p.email}</span>}
            <button type="button" onClick={() => onRemove(p.email)} aria-label={`Remove ${p.email}`} className="rounded-full p-0.5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === "," || e.key === ";" || e.key === "Tab") && text.trim()) {
              if (commit()) e.preventDefault();
            }
            if (e.key === "Backspace" && !text && people.length) onRemove(people[people.length - 1].email);
          }}
          onBlur={() => void commit()}
          placeholder={people.length ? "" : "Type an email and press Enter (or Name <email>)"}
          className="h-7 min-w-[12rem] flex-1 bg-transparent text-sm text-foreground outline-none"
        />
      </div>
      {matches.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-elevated">
          {matches.map((p) => (
            <button
              key={p.email}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onAdd(p);
                setText("");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-fill-ghost"
            >
              {p.courseId && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: courseHsla(p.courseId, 0.95) }} />}
              <span className="font-medium">{p.name ?? p.email}</span>
              {p.name && <span className="text-xs text-muted-foreground">{p.email}</span>}
              {p.professor && <span className="ml-auto text-2xs text-muted-foreground">professor</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EmailComposer({
  open,
  onOpenChange,
  initialCourseId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Start with this course's professor as the recipient. */
  initialCourseId?: string | null;
}) {
  const { courses } = useCourses();
  const { status: auth } = useAuth();
  const [instructors, setInstructors] = useState<InstructorRow[]>([]);
  const [rows, setRows] = useState<TriageRow[]>([]);
  const [contacts, setContacts] = useState<Person[]>(loadContacts);
  const [to, setTo] = useState<Person[]>([]);
  const [cc, setCc] = useState<Person[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [courseId, setCourseId] = useState<string>("none");
  const [template, setTemplate] = useState<TemplateId>("question");
  const [itemId, setItemId] = useState<string>("");
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

  const live = useMemo(() => courses.filter((c) => !c.hidden && c.gradeable), [courses]);
  const codeOf = (id: string) => {
    const c = live.find((x) => x.id === id);
    return c ? (parseCourseLabel(c.courseCode ?? c.name).code ?? courseShort(c.courseCode ?? c.name)) : "";
  };

  const professors: Person[] = useMemo(
    () =>
      live.flatMap((c) => {
        const digest = digestFor(parseCourseLabel(c.courseCode ?? c.name).code);
        const mine = instructors.filter((i) => i.courseId === c.id);
        const teacher = mine.find((i) => i.starred) ?? mine.find((i) => i.role === "teacher");
        const email = (digest?.email ?? teacher?.email ?? "").toLowerCase();
        return email ? [{ email, name: digest?.instructor ?? teacher?.name ?? null, courseId: c.id, professor: true }] : [];
      }),
    [live, instructors],
  );
  const everyone = useMemo(() => [...professors, ...contacts.filter((c) => !professors.some((p) => p.email === c.email))], [professors, contacts]);

  // Opening from a course page: that course and its professor.
  useEffect(() => {
    if (!open) return;
    if (initialCourseId) {
      setCourseId(initialCourseId);
      const p = professors.find((x) => x.courseId === initialCourseId);
      setTo(p ? [p] : []);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [open, initialCourseId, professors.length]);

  const toProfessor = to.some((p) => p.professor);
  const templates = toProfessor || to.length === 0 ? PROF_TEMPLATES : PEER_TEMPLATES;
  // Switching audience resets to that audience's first template, so a
  // classmate doesn't get the professor's "question about [assignment]".
  const [audience, setAudience] = useState<"prof" | "peer">("prof");
  const nextAudience = toProfessor || to.length === 0 ? "prof" : "peer";
  if (nextAudience !== audience) {
    setAudience(nextAudience);
    setTemplate(nextAudience === "prof" ? "question" : "hello");
  }
  const tpl = templates.some((t) => t.id === template) ? template : templates[0].id;
  const code = courseId === "none" ? "" : codeOf(courseId);
  const courseItems = rows.filter((r) => r.courseId === courseId);
  const item = courseItems.find((r) => r.assignmentId === itemId);
  const me = auth.validatedAs;
  const toKey = to.map((p) => p.email).join(",");

  // Rewrite the draft when who, what or which course changes.
  useEffect(() => {
    const d = draft(tpl, to, code, me, item);
    setSubject(d.subject);
    setBody(d.body);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- `to` is keyed by toKey
  }, [tpl, toKey, code, me, item]);

  const addTo = (list: Person[], set: (p: Person[]) => void) => (p: Person) => {
    if (list.some((x) => x.email === p.email)) return;
    set([...list, p]);
    // A professor picked by hand also picks their course.
    if (p.courseId && courseId === "none") setCourseId(p.courseId);
  };

  const saveFrom = (v: string) => {
    setFrom(v);
    try {
      localStorage.setItem(FROM_KEY, v.trim());
    } catch {
      /* per-viewer convenience */
    }
  };

  /** Remember everyone new (non-professors) you actually send to. */
  const remember = () => {
    const known = new Set(everyone.map((p) => p.email));
    const fresh = [...to, ...cc].filter((p) => !p.professor && !known.has(p.email)).map((p) => ({ ...p, courseId: p.courseId ?? (courseId === "none" ? null : courseId) }));
    if (fresh.length) {
      const next = [...contacts, ...fresh];
      setContacts(next);
      saveContacts(next);
    }
  };
  const forget = (email: string) => {
    const next = contacts.filter((c) => c.email !== email);
    setContacts(next);
    saveContacts(next);
  };

  const list = (ps: Person[]) => ps.map((p) => p.email).join(",");
  const gmailUrl = () => {
    const q = new URLSearchParams({ view: "cm", fs: "1", to: list(to), su: subject, body });
    if (cc.length) q.set("cc", list(cc));
    if (from.trim()) q.set("authuser", from.trim());
    return `https://mail.google.com/mail/?${q.toString()}`;
  };
  const mailtoUrl = () =>
    `mailto:${to.map((p) => encodeURIComponent(p.email)).join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}${cc.length ? `&cc=${encodeURIComponent(list(cc))}` : ""}`;
  const go = (url: string) => {
    remember();
    if (IS_TAURI) void openUrl(url);
    else window.open(url, "_blank", "noopener");
  };
  const ready = to.length > 0 && subject.trim().length > 0;
  const bracket = /\[[^\]]+\]/.test(subject + body);

  const quick = (p: Person) => {
    const on = to.some((x) => x.email === p.email);
    return (
      <button
        key={p.email}
        type="button"
        onClick={() => (on ? setTo(to.filter((x) => x.email !== p.email)) : addTo(to, setTo)(p))}
        aria-pressed={on}
        className={cn(
          "group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-micro",
          on ? "border-transparent text-foreground shadow-card" : "border-border text-muted-foreground hover:text-foreground",
        )}
        style={on && p.courseId ? { backgroundColor: courseHsla(p.courseId, 0.16) } : on ? { backgroundColor: "rgb(var(--foreground) / 0.08)" } : undefined}
      >
        {p.courseId ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: courseHsla(p.courseId, 0.95) }} /> : null}
        {p.professor ? `${codeOf(p.courseId ?? "")} · ${lastName(p.name)}` : (p.name ?? p.email)}
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New email</DialogTitle>
          <DialogDescription>
            To a professor, a classmate or anyone. Write it here; Gmail opens with everything filled in, and you press Send there.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Professors</span>
            <div className="flex flex-wrap gap-1.5">{professors.map(quick)}</div>
          </div>
          {contacts.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Contacts you've emailed</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {contacts.map((p) => (
                  <span key={p.email} className="group relative">
                    {quick(p)}
                    <button
                      type="button"
                      onClick={() => forget(p.email)}
                      aria-label={`Forget ${p.email}`}
                      title="Forget this contact"
                      className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-card text-muted-foreground shadow-card hover:text-foreground group-hover:flex"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <RecipientField label="To" people={to} onAdd={addTo(to, setTo)} onRemove={(e) => setTo(to.filter((p) => p.email !== e))} suggestions={everyone} />
          {showCc ? (
            <RecipientField label="Cc" people={cc} onAdd={addTo(cc, setCc)} onRemove={(e) => setCc(cc.filter((p) => p.email !== e))} suggestions={everyone} />
          ) : (
            <button type="button" onClick={() => setShowCc(true)} className="flex w-fit items-center gap-1 text-xs font-medium text-brand-fg hover:underline">
              <Plus className="h-3 w-3" /> Add Cc
            </button>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              Class
              <Select value={courseId} onValueChange={(v) => { setCourseId(v); setItemId(""); }}>
                <SelectTrigger className="h-9 text-sm text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not about a class</SelectItem>
                  {live.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {codeOf(c.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
              What it's about
              <Select value={tpl} onValueChange={(v) => setTemplate(v as TemplateId)}>
                <SelectTrigger className="h-9 text-sm text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            {courseId !== "none" && (tpl === "question" || tpl === "missing" || tpl === "group") && (
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
              rows={9}
              className="resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {bracket && <p className="text-xs text-at-risk-fg">Fill in the parts in [brackets] before sending.</p>}

          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Send from (the Gmail account to open; your SJSU address for school email)
            <input
              value={from}
              onChange={(e) => saveFrom(e.target.value)}
              placeholder="you@sjsu.edu"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button disabled={!ready} onClick={() => go(gmailUrl())}>
              <Send className="mr-1.5 h-4 w-4" /> Send with Gmail
              <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-70" />
            </Button>
            <Button variant="outline" disabled={!ready} onClick={() => go(mailtoUrl())}>
              <Mail className="mr-1.5 h-4 w-4" /> Open in Mail app
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const lines = [`To: ${list(to)}`, cc.length ? `Cc: ${list(cc)}` : null, `Subject: ${subject}`, "", body].filter((l) => l !== null);
                void navigator.clipboard
                  .writeText(lines.join("\n"))
                  .then(() => toast.success("Copied the email."))
                  .catch(() => toast.error("Could not copy."));
              }}
            >
              <Copy className="mr-1.5 h-4 w-4" /> Copy
            </Button>
            <span className="basis-full text-xs text-muted-foreground">
              {ready
                ? "Gmail opens with this email ready to go. Check it, then click Send in Gmail. (The app can't send on its own; that needs Google's permission.)"
                : "Add a recipient and a subject to send."}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
