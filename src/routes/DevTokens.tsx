/**
 * DevTokens — a live swatch sheet with measured contrast ratios.
 *
 * Called by: the router, at "/dev/tokens", and only when `import.meta.env.DEV`
 * is true. It is not reachable in a release build.
 * Calls: getComputedStyle. No IPC, no data.
 *
 * §9.6 asks for every signal colour to be verified at 4.5:1 against its
 * background in *both* modes, and specifically warns that amber is the one that
 * usually fails in light mode. A screenshot cannot verify that; a number can.
 * So this page reads the tokens as the browser actually resolved them and
 * computes the ratio live — flip the theme toggle and watch the column change.
 *
 * `npm run check:tokens` covers the same ground in CI, from the CSS source.
 * This page exists for the moment you are changing a colour and want to see it.
 */
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";

/** Read a `--token` off :root and return its sRGB channels. */
function channels(name: string): [number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  const parts = raw.split(/[\s,]+/).map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** WCAG 2.x relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a: string, b: string): number {
  const la = luminance(channels(a));
  const lb = luminance(channels(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Signal tokens, paired fill + text variant. */
const SIGNALS = ["on-track", "at-risk", "critical", "locked"] as const;
const SURFACES = ["bg", "surface", "elevated", "border"] as const;

export default function DevTokens() {
  const { resolved } = useTheme();

  return (
    <>
      <ScreenHeader
        title="Design tokens"
        subtitle={`Measured live in ${resolved} mode. Flip the theme and the numbers move.`}
        actions={<ThemeToggle />}
      />

      <div className="mx-6 mb-10 flex max-w-3xl flex-col gap-8">
        <section>
          <h2 className="mb-2 text-sm font-medium">Surfaces</h2>
          <div className="flex flex-wrap gap-2">
            {SURFACES.map((t) => (
              <Swatch key={t} token={t} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-1 text-sm font-medium">Signal palette</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            The fill needs 3:1 as a graphical object (WCAG 1.4.11). The <code>-fg</code> variant is
            what text uses and needs 4.5:1. This split is the documented deviation from §9.1.
          </p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-1.5 font-medium">Signal</th>
                <th className="py-1.5 font-medium">Fill on bg</th>
                <th className="py-1.5 font-medium">Text on bg</th>
                <th className="py-1.5 font-medium">Text on surface</th>
              </tr>
            </thead>
            <tbody>
              {SIGNALS.map((t) => (
                <tr key={t} className="border-b border-border/60">
                  <td className="py-2">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: `rgb(var(--${t}))` }}
                      />
                      <code className="text-xs">{t}</code>
                    </span>
                  </td>
                  <Ratio value={ratio(t, "bg")} min={3} />
                  <Ratio value={ratio(`${t}-fg`, "bg")} min={4.5} />
                  <Ratio value={ratio(`${t}-fg`, "surface")} min={4.5} />
                </tr>
              ))}
              <tr className="border-b border-border/60">
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: "rgb(var(--accent))" }}
                    />
                    <code className="text-xs">accent (brand)</code>
                  </span>
                </td>
                <Ratio value={ratio("accent", "bg")} min={3} />
                <Ratio value={ratio("accent-fg", "bg")} min={4.5} />
                <Ratio value={ratio("accent-fg", "surface")} min={4.5} />
              </tr>
              <tr>
                <td className="py-2">
                  <code className="text-xs">primary-foreground on primary</code>
                </td>
                <td />
                <Ratio value={ratio("primary-foreground", "primary")} min={4.5} />
                <td />
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium">Text</h2>
          <table className="w-full border-collapse text-sm">
            <tbody>
              {(["text", "text-muted"] as const).map((t) => (
                <tr key={t} className="border-b border-border/60">
                  <td className="py-2">
                    <code className="text-xs">{t}</code>
                  </td>
                  <Ratio value={ratio(t, "bg")} min={4.5} />
                  <Ratio value={ratio(t, "surface")} min={4.5} />
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium">Type scale</h2>
          <div className="flex flex-col gap-1">
            <p className="font-display text-display" data-numeric>
              94.2%
            </p>
            <p className="font-display text-xl">28 · display face, screen titles</p>
            <p className="text-lg">20 · section heads</p>
            <p className="text-base">16 · body</p>
            <p className="text-sm">14 · UI default</p>
            <p className="text-xs">13 · dense rows</p>
            <p className="text-2xs">12 · labels</p>
            <p className="font-mono text-sm" data-numeric>
              0123456789 · tabular — 111.1 and 000.0 occupy the same width
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

function Swatch({ token }: { token: string }) {
  const hex = toHex(channels(token));
  return (
    <div className="w-32 overflow-hidden rounded-md border border-border">
      <div className="h-10" style={{ background: `rgb(var(--${token}))` }} />
      <div className="bg-surface px-2 py-1">
        <div className="text-2xs">{token}</div>
        <div data-numeric className="font-mono text-2xs text-muted-foreground">
          {hex}
        </div>
      </div>
    </div>
  );
}

function Ratio({ value, min }: { value: number; min: number }) {
  const pass = value >= min;
  return (
    <td className="py-2">
      <span
        data-numeric
        className={`font-mono text-xs ${pass ? "text-on-track-fg" : "text-critical-fg"}`}
      >
        {value.toFixed(2)}:1 {pass ? "✓" : `✕ needs ${min}`}
      </span>
    </td>
  );
}
