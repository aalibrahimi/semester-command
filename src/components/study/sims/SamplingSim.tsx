/**
 * SamplingSim — sampling, aliasing and quantization you can see and hear.
 *
 * params: { f?: number (Hz, default 7), fs?: number (default 8), bits?:
 * number (default 3), audioScale?: number (default 100) }
 *
 * Two dials: the signal frequency F and the sampling rate Fₛ, on a
 * one-second window so the numbers are small enough to count. The plot
 * shows the true wave, the samples the computer keeps, and the wave those
 * samples reconstruct (the alias when F > Fₛ/2). A third dial, bits, snaps
 * the samples to 2^bits levels (Koo's snap-down). Sound: the tones are
 * played ×audioScale so a 7 Hz picture is a 700 Hz tone; "what the
 * computer keeps" plays the alias, so you hear the fold.
 */
import { useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { BTN, LABEL, num, Dial, type SimProps } from "./index";

function fold(F: number, Fs: number): number {
  let f = ((F % Fs) + Fs) % Fs;
  if (f > Fs / 2) f = Fs - f;
  return f;
}

function quantize(v: number, bits: number): number {
  // v in [-1, 1] → 2^bits levels, snap down (floor), then back to [-1, 1].
  const levels = 2 ** bits;
  const idx = Math.min(levels - 1, Math.floor(((v + 1) / 2) * levels));
  return (idx / (levels - 1)) * 2 - 1;
}

export function SamplingSim({ params }: SimProps) {
  const [F, setF] = useState(num(params, "f", 7));
  const [Fs, setFs] = useState(num(params, "fs", 8));
  const [bits, setBits] = useState(num(params, "bits", 3));
  const [showQ, setShowQ] = useState(false);
  const scale = num(params, "audioScale", 100);
  const ctx = useRef<AudioContext | null>(null);

  const alias = fold(F, Fs);
  const nyq = Fs / 2;
  const aliased = F > nyq;

  const W = 640;
  const H = 220;
  const pad = 28;
  const plotW = W - 2 * pad;
  const mid = H / 2;
  const amp = 70;
  const xOf = (t: number) => pad + t * plotW;
  const yOf = (v: number) => mid - v * amp;

  const paths = useMemo(() => {
    const N = 600;
    const pts = (fn: (t: number) => number) =>
      Array.from({ length: N + 1 }, (_, i) => {
        const t = i / N;
        return `${i === 0 ? "M" : "L"} ${xOf(t).toFixed(1)} ${yOf(fn(t)).toFixed(1)}`;
      }).join(" ");
    const real = pts((t) => Math.cos(2 * Math.PI * F * t));
    const recon = pts((t) => Math.cos(2 * Math.PI * alias * t));
    const n = Math.round(Fs);
    const samples = Array.from({ length: n + 1 }, (_, k) => {
      const t = k / Fs;
      const v = Math.cos(2 * Math.PI * F * t);
      return { t, v, q: quantize(v, bits) };
    }).filter((s) => s.t <= 1);
    // Staircase of quantized samples (sample-and-hold).
    const stair = samples
      .map((s, i) => {
        const x0 = xOf(s.t);
        const x1 = xOf(Math.min(1, (i + 1) / Fs));
        return `${i === 0 ? "M" : "L"} ${x0.toFixed(1)} ${yOf(s.q).toFixed(1)} L ${x1.toFixed(1)} ${yOf(s.q).toFixed(1)}`;
      })
      .join(" ");
    return { real, recon, samples, stair };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [F, Fs, bits]);

  const play = (kind: "real" | "kept" | "quant") => {
    try {
      const AC = window.AudioContext;
      if (!AC) return;
      ctx.current ??= new AC();
      const ac = ctx.current;
      const sr = ac.sampleRate;
      const secs = 1.2;
      const buf = ac.createBuffer(1, Math.floor(sr * secs), sr);
      const data = buf.getChannelData(0);
      const freq = (kind === "kept" ? alias : F) * scale;
      for (let i = 0; i < data.length; i++) {
        const t = i / sr;
        let v = Math.cos(2 * Math.PI * freq * t);
        if (kind === "quant") v = quantize(v, bits);
        // Short fade in/out so it doesn't click.
        const env = Math.min(1, t / 0.02, (secs - t) / 0.05);
        data[i] = v * 0.25 * Math.max(0, env);
      }
      const src = ac.createBufferSource();
      src.buffer = buf;
      src.connect(ac.destination);
      src.start();
    } catch {
      /* no audio available: the picture still works */
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-4">
        <Dial label="Signal F" value={F} min={1} max={24} unit="Hz" onChange={setF} />
        <Dial label="Sampling rate Fₛ" value={Fs} min={2} max={48} unit="Hz" onChange={setFs} />
        <Dial label="Bits" value={bits} min={1} max={8} unit={`→ ${2 ** bits} levels`} onChange={setBits} />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Sampling plot">
        <g fontFamily="ui-sans-serif, system-ui" fontSize="11" fill="currentColor">
          <line x1={pad} y1={mid} x2={W - pad} y2={mid} stroke="currentColor" strokeOpacity="0.25" />
          <line x1={pad} y1={mid - amp - 10} x2={pad} y2={mid + amp + 10} stroke="currentColor" strokeOpacity="0.25" />
          <text x={W - pad} y={mid + amp + 22} textAnchor="end" fillOpacity="0.6">
            1 second
          </text>
          <text x={pad + 4} y={mid - amp - 14} fillOpacity="0.6">
            +1
          </text>
          {/* True wave */}
          <path d={paths.real} fill="none" stroke="rgb(var(--on-track))" strokeWidth="1.8" />
          {/* Reconstruction */}
          {aliased && <path d={paths.recon} fill="none" stroke="rgb(var(--critical))" strokeWidth="1.6" strokeDasharray="6 4" />}
          {/* Staircase */}
          {showQ && <path d={paths.stair} fill="none" stroke="rgb(var(--at-risk))" strokeWidth="1.6" />}
          {/* Samples */}
          {paths.samples.map((s, i) => (
            <g key={i}>
              <line x1={xOf(s.t)} y1={mid} x2={xOf(s.t)} y2={yOf(showQ ? s.q : s.v)} stroke="rgb(var(--accent))" strokeOpacity="0.5" />
              <circle cx={xOf(s.t)} cy={yOf(showQ ? s.q : s.v)} r="3.2" fill="rgb(var(--accent))" />
            </g>
          ))}
        </g>
      </svg>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 bg-on-track" /> true wave, {F} Hz
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-brand" /> {paths.samples.length} samples ({Fs} per second)
        </span>
        {aliased ? (
          <span className="flex items-center gap-1.5 text-critical-fg">
            <span className="inline-block h-0.5 w-5 border-t border-dashed border-critical" /> what the samples reconstruct: {alias} Hz (the alias)
          </span>
        ) : (
          <span className="text-on-track-fg">F ≤ Fₛ/2 = {nyq}: the samples pin down the true wave</span>
        )}
        <label className="ml-auto flex items-center gap-1.5">
          <input type="checkbox" checked={showQ} onChange={(e) => setShowQ(e.target.checked)} className="accent-[rgb(var(--accent))]" /> show quantized ({bits} bits)
        </label>
      </div>

      <div className="rounded-lg border border-border/60 bg-fill-ghost/40 px-3 py-2 text-xs leading-relaxed">
        Nyquist = Fₛ/2 = <b>{nyq} Hz</b>. {aliased ? `${F} is above it, so it folds: ${F} → ${alias} Hz (mirror around ${nyq}). Once sampled, no algorithm can tell them apart.` : `${F} is inside the band, so it survives. Push F past ${nyq} to see the fold.`}
        {" "}Quantization: {2 ** bits} levels, step {(2 / (2 ** bits - 1)).toFixed(3)}; each extra bit halves the step (about 6 dB less noise).
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={LABEL}>Hear it (×{scale})</span>
        <button type="button" className={BTN} onClick={() => play("real")}>
          <Volume2 className="h-3.5 w-3.5" /> true tone, {F * scale} Hz
        </button>
        <button type="button" className={BTN} onClick={() => play("kept")}>
          <Volume2 className="h-3.5 w-3.5" /> what the computer keeps, {alias * scale} Hz
        </button>
        <button type="button" className={BTN} onClick={() => play("quant")}>
          <Volume2 className="h-3.5 w-3.5" /> {bits}-bit version
        </button>
      </div>
    </div>
  );
}
