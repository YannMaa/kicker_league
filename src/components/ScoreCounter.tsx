export function ScoreCounter({
  value,
  onChange,
  side,
}: {
  value: number;
  onChange: (v: number) => void;
  side: 'red' | 'blue';
}) {
  // intern: 'red' = Team Black, 'blue' = Team White
  const color =
    side === 'red'
      ? 'bg-team-black text-white border-2 border-white/60'
      : 'bg-team-white text-black shadow-[0_4px_0_#94a3b8]';
  const set = (v: number) => onChange(Math.max(0, Math.min(99, v)));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`scoreboard w-24 rounded-xl py-1 text-center text-6xl ${side === 'red' ? '!text-slate-400' : '!text-white'}`}>
        {value}
      </div>
      {/* Sliding beads like on a real table: moved = counted */}
      <button
        type="button"
        onClick={() => set(value + 1)}
        className="relative flex h-8 w-full max-w-[11rem] items-center rounded-full bg-black/30 px-1"
        aria-label="Add goal"
      >
        <div className="rod absolute inset-x-1 top-1/2 -translate-y-1/2" />
        <div className="relative flex w-full justify-between">
          <div className="flex gap-0.5">
            {Array.from({ length: Math.min(value, 10) }).map((_, i) => (
              <span key={i} className="bead" style={{ width: 14, height: 14 }} />
            ))}
          </div>
          <div className="flex gap-0.5">
            {Array.from({ length: Math.max(0, 10 - value) }).map((_, i) => (
              <span key={i} className="bead opacity-60" style={{ width: 14, height: 14 }} />
            ))}
          </div>
        </div>
      </button>
      <div className="flex gap-2">
        <button type="button" className="btn-ghost h-12 w-12 !p-0 text-2xl" onClick={() => set(value - 1)}>
          −
        </button>
        <button type="button" className={`btn ${color} h-12 w-12 !p-0 text-2xl`} onClick={() => set(value + 1)}>
          +
        </button>
        <button type="button" className="btn-ball h-12 !px-3 text-lg" onClick={() => set(10)}>
          10
        </button>
      </div>
    </div>
  );
}
