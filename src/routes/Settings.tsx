/**
 * Settings — auth, appearance, and the escape hatches.
 *
 * Called by: the router, at "/settings"; linked from the sidebar footer and
 * from every empty state.
 * Calls: ThemeToggle. From M1: the auth commands.
 *
 * The auth section is the reason this screen matters. SJSU has disabled
 * student-generated API tokens, so there are three tiers (§2.0) and the user
 * needs to know which one is currently carrying their data — a grade sourced
 * from a calendar feed plus manual entry is a different kind of number than one
 * Canvas confirmed, and the app should never blur that line.
 *
 * TODO(M1): wire all three tiers, plus the session-expiry reconnect flow.
 */
import { KeyRound, Link2, PencilLine } from "lucide-react";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  return (
    <>
      <ScreenHeader title="Settings" />

      <div className="mx-6 mb-8 flex max-w-3xl flex-col gap-4">
        <Alert>
          <AlertTitle>Read-only, always</AlertTitle>
          <AlertDescription>
            This app only ever issues GET requests to Canvas. It never submits work, never posts,
            and never touches a live assessment. The only writes it makes are to the local database
            on this machine.
          </AlertDescription>
        </Alert>

        {/* ── Auth ──────────────────────────────────────────────────────── */}
        <Card>
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
              status="Not connected"
              description="Opens an SJSU login window. You sign in through SSO yourself, including MFA — the app never sees your password, only the resulting session cookie. Sessions expire; you will be asked to sign in again periodically."
              cta="Sign in to Canvas"
            />
            <Separator />
            <AuthTier
              icon={KeyRound}
              tier="Tier 0"
              name="Access token"
              status="Unavailable"
              description="If an SJSU administrator ever issues you a scoped read-only token, paste it here and everything above becomes unnecessary. The client supports both paths behind the same interface."
              cta="Enter token"
            />
            <Separator />
            <AuthTier
              icon={PencilLine}
              tier="Tier 2"
              name="Calendar feed"
              status="Not configured"
              description="Your private Canvas .ics URL from Calendar → Calendar Feed. Needs no login and always works, but carries due dates only — no grades, no weights, no rubrics. Paired with entering scores by hand, the grade engine still works end to end."
              cta="Add feed URL"
            />
          </CardContent>
        </Card>

        {/* ── Appearance ────────────────────────────────────────────────── */}
        <Card>
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
    </>
  );
}

/** One row of the auth card. Disabled until M1 wires the commands — visible and
 *  disabled beats hidden, because the tiers themselves are information. */
function AuthTier({
  icon: Icon,
  tier,
  name,
  status,
  description,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tier: string;
  name: string;
  status: string;
  description: string;
  cta: string;
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
      <Button variant="outline" size="sm" disabled className="shrink-0 self-start">
        {cta}
      </Button>
    </div>
  );
}
