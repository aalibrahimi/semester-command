/**
 * FourierSim — build a wave out of harmonics.
 *
 * params: { f0?: number (Hz, default 2), shape?: "square" | "sawtooth" |
 * "triangle", harmonics?: number (default 3), audioF0?: number (default 110) }
 *
 * A dial for how many harmonics to add, a shape to aim at, and two plots:
 * the partial sum against the target (time), and the one-sided magnitude
 * spectrum as stems at kF₀ (frequency). Every stem's height is the
 * amplitude the series says, so you can read Lab 4's "amplitude of the 5th
 * harmonic" straight off the picture. Play adds the harmonics as real
 * oscillators, so the sound fills in as you drag.
 */
import { useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BTN, LABEL, num, str, Dial, type SimProps } from "./index";

type Shape = "square" | "sawtooth" | "triangle";

/** Amplitude and phase (in units of π) of harmonic k for each shape (Fourier series, DC removed). */
function coef(shape: Shape, k: number): { A: number; sin: boolean; sign: number } | null {
  if (shape === "square") return k % 2 === 1 ? { A: 4 / (Math.PI * k), sin: true, sign: 1 } : null;
  if (shape === "sawtooth") return { A: 2 / (Math.PI * k), sin: true, sign: k % 2 === 1 ? 1 : -1 };
  return k % 2 === 1 ? { A: 8 / (Math.PI * Math.PI * k * k), sin: false, sign: (k - 1) % 4 === 0 ? 1 : -1 } : null;
}

function target(shape: Shape, ph: number): number {
  // ph in [0,1)
  if (shape === "square") return ph < 0.5 ? 1 : -1;
  if (shape === "sawtooth") return ph < 0.5 ? 2 * ph : 2 * ph - 2;
  return ph < 0.5 ? 1 - 4 * ph : -3 + 4 * ph;
}

export function FourierSim({ params }: SimProps) {
  const [shape, setShape] = useState<Shape>((str(params, "shape", "square") as Shape) || "square");
  const [K, setK] = useState(num(params, "harmonics", 3));
  const F0 = num(params, "f0", 2);
  const audioF0 = num(params, "audioF0", 110);
  const ctx = useRef<AudioContext | null>(null);

  const terms = useMemo(() => {
    const out: { k: number; A: number; sin: boolean; sign: number }[] = [];
    for (let k = 1; k <= K; k++) {
      const c = coef(shape, k);
      if (c) out.push({ k, ...c });
    }
    return out;
  }, [shape, K]);

  const W = 640;
  const H = 200;
  const pad = 28;
  const mid = H / 2;
  const amp = 62;
  const plotW = W - 2 * pad;
  const secs = 1;

  const sum = (t: number) => terms.reduce((s, c) => s + c.sign * c.A * (c.sin ? Math.sin(2 * Math.PI * c.k * F0 * t) : Math.cos(2 * Math.PI * c.k * F0 * t)), 0);
  const path = (fn: (t: number) => number) =>
    Array.from({ length: 801 }, (_, i) => {
      const t = (i / 800) * secs;
      return `${i === 0 ? "M" : "L"} ${(pad + (i / 800) * plotW).toFixed(1)} ${(mid - fn(t) * amp).toFixed(1)}`;
    }).join(" ");
  const tPath = path((t) => target(shape, (t * F0) % 1));
  const sPath = path(sum);

  // Spectrum plot
  const SW = 640;
  const SH = 130;
  const maxK = Math.max(K, 8);
  const maxA = Math.max(...terms.map((c) => c.A), 1.3);

  const play = () => {
    try {
      const AC = window.AudioContext;
      if (!AC) return;
      ctx.current ??= new AC();
      const ac = ctx.current;
      const now = ac.currentTime;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      gain.connect(ac.destination);
      for (const c of terms) {
        const o = ac.createOscillator();
        o.type = "sine";
        o.frequency.value = c.k * audioF0;
        const g = ac.createGain();
        g.gain.value = c.A / 1.3;
        o.connect(g);
        g.connect(gain);
        o.start(now);
        o.stop(now + 1.55);
      }
    } catch {
      /* no audio */
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <span className={LABEL}>Target shape</span>
          <div className="flex gap-1">
            {(["square", "sawtooth", "triangle"] as Shape[]).map((s) => (
              <button key={s} type="button" onClick={() => setShape(s)} className={cn("rounded-md border px-2 py-1 text-xs", shape === s ? "border-brand bg-brand/[0.1] text-brand-fg" : "border-border/70 hover:bg-fill-ghost")}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <Dial label="Harmonics added (k up to)" value={K} min={1} max={40} onChange={setK} />
        <button type="button" className={BTN} onClick={play}>
          <Volume2 className="h-3.5 w-3.5" /> Play ({audioF0} Hz base)
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Partial sum against the target wave">
        <g fontFamily="ui-sans-serif, system-ui" fontSize="11" fill="currentColor">
          <line x1={pad} y1={mid} x2={W - pad} y2={mid} stroke="currentColor" strokeOpacity="0.25" />
          <path d={tPath} fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.4" />
          <path d={sPath} fill="none" stroke="rgb(var(--accent))" strokeWidth="1.9" />
          <text x={W - pad} y={H - 6} textAnchor="end" fillOpacity="0.6">
            {secs} s · F₀ = {F0} Hz · {terms.length} term{terms.length === 1 ? "" : "s"} ({shape} has {shape === "sawtooth" ? "every" : "only odd"} harmonics)
          </text>
        </g>
      </svg>

      <svg viewBox={`0 0 ${SW} ${SH}`} className="h-auto w-full" role="img" aria-label="Magnitude spectrum">
        <g fontFamily="ui-sans-serif, system-ui" fontSize="11" fill="currentColor">
          <line x1={pad} y1={SH - 24} x2={SW - pad} y2={SH - 24} stroke="currentColor" strokeOpacity="0.25" />
          {Array.from({ length: maxK }, (_, i) => i + 1).map((k) => {
            const c = terms.find((t) => t.k === k);
            const x = pad + ((k - 0.5) / maxK) * (SW - 2 * pad);
            const h = c ? (c.A / maxA) * (SH - 64) : 0;
            return (
              <g key={k}>
                {c && <line x1={x} y1={SH - 24} x2={x} y2={SH - 24 - h} stroke="rgb(var(--accent))" strokeWidth="3" strokeLinecap="round" />}
                {c && (
                  <text x={x} y={SH - 28 - h} textAnchor="middle" fontSize="10">
                    {c.A.toFixed(2)}
                  </text>
                )}
                <text x={x} y={SH - 8} textAnchor="middle" fillOpacity={c ? 0.9 : 0.4}>
                  {k * F0}
                </text>
              </g>
            );
          })}
          <text x={pad} y={14} fillOpacity="0.6">
            one-sided magnitude spectrum: amplitude at k·F₀ (Hz)
          </text>
        </g>
      </svg>

      <div className="rounded-lg border border-border/60 bg-fill-ghost/40 px-3 py-2 text-xs leading-relaxed">
        {shape === "square" && "Square: A_k = 4/(πk) for odd k, zero for even k. The sharp edges need the high harmonics; notice the overshoot at the corners that never quite goes away (Gibbs)."}
        {shape === "sawtooth" && "Sawtooth: A_k = 2/(πk) for every k, alternating sign. Amplitudes fall as 1/k, so the harmonics linger: a buzzy sound."}
        {shape === "triangle" && "Triangle: A_k = 8/(π²k²) for odd k. Amplitudes fall as 1/k², so a few terms already look right and it sounds soft, close to a sine."}
        {" "}Period T₀ = 1/F₀ = {(1 / F0).toFixed(3)} s; harmonic k sits at {F0}·k Hz.
      </div>
    </div>
  );
}
