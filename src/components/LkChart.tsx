import { LK_START, type LkPoint } from '../lib/rating';

/** LK-Verlauf: LK 1 (beste) liegt oben, eine Verbesserung geht also nach oben. */
export function LkChart({ points }: { points: LkPoint[] }) {
  if (points.length < 2) return <p className="text-sm text-white/70">Not enough matches for a chart yet.</p>;
  const w = 320, h = 120, pad = 8;
  const vals = points.map((p) => p.lk);
  const min = Math.min(...vals, LK_START) - 0.3, max = Math.max(...vals, LK_START) + 0.3;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - 2 * pad);
  const y = (v: number) => pad + ((v - min) / (max - min)) * (h - 2 * pad); // kleine LK = oben
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const base = y(LK_START);
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="LK history">
        <line x1={0} x2={w} y1={base} y2={base} stroke="white" strokeOpacity={0.4} strokeDasharray="4 4" />
        <path d={d} fill="none" stroke="#fde047" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(points.length - 1)} cy={y(vals[vals.length - 1])} r={4.5} fill="#fff" />
      </svg>
      <p className="mt-1 text-center text-[10px] text-white/60">Up = better LK (dashed line = start, LK {LK_START})</p>
    </div>
  );
}
