/**
 * Settings — auth, appearance, and the escape hatches.
 *
 * Called by: the router, at "/settings"; linked from the sidebar footer and
 * from every empty state.
 * Calls: useAuth (live status + actions), ThemeToggle.
 *
 * The auth section is the reason this screen matters. SJSU has disabled
 * student-generated API tokens, so there are three tiers (§2.0) and the user
 * needs to know which one is currently carrying their data — a grade sourced
 * from a calendar feed plus manual entry is a different kind of number than one
 * Canvas confirmed, and the app should never blur that line.
 *
 * TODO(M1 step 7): wire Tier 2 (the calendar feed URL field).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Link2, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import {
  getCalendarFeedUrl,
  IS_TAURI,
  setCalendarFeedUrl,
  triggerIcsImport,
} from "@/lib/ipc";

export default function Settings() {
  const { status, busy, signIn, saveToken, signOut } = useAuth();
  const [tokenOpen, setTokenOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedUrl, setFeedUrl] = useState<string | null>(null);

  useEffect(() => {
    // oxlint-disable-next-line set-state-in-effect -- reads external state once
    void getCalendarFeedUrl().then(setFeedUrl).catch(() => {});
  }, []);

  const sessionActive = status.tier === "session";
  const tokenActive = status.tier === "token";

  /** Status line for Tier 1, honest about the three states that matter. */
  const sessionStatus = sessionActive
    ? status.alive
      ? `Connected${status.validatedAs ? ` as ${status.validatedAs}` : ""}${
          status.storage === "file" ? " · stored in fallback file (keyring unavailable)" : ""
        }`
      : "Session expired — sign in again"
    : busy
      ? (status.message ?? "Waiting for you to sign in…")
      : "Not connected";

  const handleSignIn = () => {
    void signIn().catch((e: unknown) => {
      toast.error(errorText(e, "Could not open the login window"));
    });
  };

  const handleSignOut = () => {
    void signOut()
      .then(() => toast.success("Signed out. Local data is untouched."))
      .catch((e: unknown) => toast.error(errorText(e, "Could not clear the session")));
  };

  return (
    <>
      <ScreenHeader title="Settings" />

      <div className="mx-8 mb-8 flex max-w-3xl flex-col gap-4">
        <Alert>
          <AlertTitle>Read-only, always</AlertTitle>
          <AlertDescription>
            This app only ever issues GET requests to Canvas. It never submits work, never posts,
            and never touches a live assessment. The only writes it makes are to the local database
            on this machine.
          </AlertDescription>
        </Alert>

        {/* ── Auth ──────────────────────────────────────────────────────── */}
        <Card className="rounded-2xl border-border/60 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Canvas connection</CardTitle>
            <CardDescription>
              SJSU has disabled student-generated access tokens, so there are three ways in. Each
              degrades into the next.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <AuthTier
              icon={Link2}
              tier="Tier 1"
              name="Sign in to Canvas"
              status={sessionStatus}
              description="Opens an SJSU login window. You sign in through SSO yourself, including MFA — the app never sees your password, only the resulting session cookie. Sessions expire; you will be asked to sign in again periodically."
              cta={sessionActive && status.alive ? "Sign out" : busy ? "Waiting…" : "Sign in to Canvas"}
              disabled={!IS_TAURI || busy || tokenActive}
              onCta={sessionActive && status.alive ? handleSignOut : handleSignIn}
            />
            <Separator />
            <AuthTier
              icon={KeyRound}
              tier="Tier 0"
              name="Access token"
              status={
                tokenActive
                  ? status.alive
                    ? `Active${status.validatedAs ? ` as ${status.validatedAs}` : ""}`
                    : "Token no longer works"
                  : "None entered"
              }
              description="If an SJSU administrator ever issues you a scoped read-only token, paste it here and everything above becomes unnecessary. The client supports both paths behind the same interface."
              cta={tokenActive ? "Remove" : "Enter token"}
              disabled={!IS_TAURI}
              onCta={tokenActive ? handleSignOut : () => setTokenOpen(true)}
            />
            <Separator />
            <AuthTier
              icon={PencilLine}
              tier="Tier 2"
              name="Calendar feed"
              status={feedUrl ? "Configured" : "Not configured"}
              description="Your private Canvas .ics URL from Calendar → Calendar Feed. Needs no login and always works, but carries due dates only — no grades, no weights, no rubrics. Paired with entering scores by hand, the grade engine still works end to end."
              cta={feedUrl ? "Change / import" : "Add feed URL"}
              disabled={!IS_TAURI}
              onCta={() => setFeedOpen(true)}
            />
          </CardContent>
        </Card>

        {/* Dev-only: the sync debug surface. Statically stripped in release. */}
        {import.meta.env.DEV && (
          <Card className="rounded-2xl border-dashed border-border/60">
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div>
                <div className="text-sm font-medium">Sync debug</div>
                <p className="text-xs text-muted-foreground">
                  Row counts, the sync log, and raw Canvas JSON. Dev builds only.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/dev/debug">Open</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Appearance ────────────────────────────────────────────────── */}
        <Card className="rounded-2xl border-border/60 shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>
              Defaults to your OS preference and follows it live.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">Theme</span>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>
      </div>

      <TokenDialog open={tokenOpen} onOpenChange={setTokenOpen} onSave={saveToken} />
      <FeedDialog
        open={feedOpen}
        onOpenChange={setFeedOpen}
        current={feedUrl}
        onSaved={setFeedUrl}
      />
    </>
  );
}

/**
 * Tier 2 configuration: store the feed URL, optionally import right away.
 * The URL is a capability secret (it grants read access to due dates), so it
 * renders masked like the token field.
 */
function FeedDialog({
  open,
  onOpenChange,
  current,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: string | null;
  onSaved: (url: string | null) => void;
}) {
  const [url, setUrl] = useState("");
  const [working, setWorking] = useState(false);

  const close = (next: boolean) => {
    if (!next) setUrl("");
    onOpenChange(next);
  };

  const saveAndImport = () => {
    const next = url.trim() === "" ? current : url.trim();
    if (!next) return;
    setWorking(true);
    setCalendarFeedUrl(next)
      .then(() => {
        onSaved(next);
        return triggerIcsImport();
      })
      .then((s) => {
        toast.success(
          `Imported ${s.assignments} assignment${s.assignments === 1 ? "" : "s"}` +
            (s.coursesCreated > 0 ? ` across ${s.coursesCreated} new course entries` : ""),
        );
        close(false);
      })
      .catch((e: unknown) => toast.error(errorText(e, "Import failed")))
      .finally(() => setWorking(false));
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Canvas calendar feed</DialogTitle>
          <DialogDescription>
            In Canvas: Calendar → Calendar Feed → copy the URL. It carries every due date across
            your courses and needs no login.{" "}
            {current ? "A feed is already configured; leave the field empty to just re-import." : ""}
          </DialogDescription>
        </DialogHeader>
        <input
          type="password"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={current ? "Keep current feed URL" : "https://sjsu.instructure.com/feeds/calendars/…"}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} disabled={working}>
            Cancel
          </Button>
          <Button onClick={saveAndImport} disabled={working || (url.trim() === "" && !current)}>
            {working ? "Importing…" : "Save and import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** One row of the auth card. */
function AuthTier({
  icon: Icon,
  tier,
  name,
  status,
  description,
  cta,
  disabled,
  onCta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tier: string;
  name: string;
  status: string;
  description: string;
  cta: string;
  disabled?: boolean;
  onCta?: () => void;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          <Badge variant="secondary" className="font-mono text-2xs">
            {tier}
          </Badge>
          <span className="text-2xs text-muted-foreground">{status}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={onCta}
        className="shrink-0 self-start"
      >
        {cta}
      </Button>
    </div>
  );
}

/**
 * The Tier 0 token entry dialog. The token goes straight to Rust, is validated
 * against Canvas before storage, and is never echoed back — the input clears
 * on every close for the same reason.
 */
function TokenDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (token: string) => Promise<void>;
}) {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  const close = (next: boolean) => {
    if (!next) setToken("");
    onOpenChange(next);
  };

  const submit = () => {
    setSaving(true);
    onSave(token)
      .then(() => {
        toast.success("Token validated and stored.");
        close(false);
      })
      .catch((e: unknown) => toast.error(errorText(e, "Canvas rejected that token")))
      .finally(() => setSaving(false));
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Canvas access token</DialogTitle>
          <DialogDescription>
            Validated against Canvas before it is stored in the OS keyring. Never leaves this
            machine.
          </DialogDescription>
        </DialogHeader>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste the token"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-md border border-border bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || token.trim() === ""}>
            {saving ? "Validating…" : "Validate and save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Pull the display message out of a CommandError (or anything else thrown). */
function errorText(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
    return e.message;
  }
  if (typeof e === "string") return e;
  return fallback;
}
