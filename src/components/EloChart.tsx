import type { EloPoint } from '../lib/rating';

export function EloChart({ points }: { points: EloPoint[] }) {
  if (points.length < 2) return <p className="text-sm text-white/70">Not enough matches for a chart yet.</p>;
  const w = 320, h = 120, pad = 8;
  const vals = points.map((p) => p.elo);
  const min = Math.min(...vals) - 10, max = Math.max(...vals) + 10;
  const x = (i: number) => pad + (i / (points.length - 1)) * (w - 2 * pad);
  const y = (v: number) => h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.elo).toFixed(1)}`).join(' ');
  const base = y(1000);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Elo history">
      {base > 0 && base < h && <line x1={0} x2={w} y1={base} y2={base} stroke="white" strokeOpacity={0.4} strokeDasharray="4 4" />}
      <path d={d} fill="none" stroke="#fde047" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(vals[vals.length - 1])} r={4.5} fill="#fff" />
    </svg>
  );
}
