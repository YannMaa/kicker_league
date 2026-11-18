import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeague } from '../lib/store';
import type { Player } from '../lib/types';
import { Avatar } from './Avatar';

export function PlayerPicker({
  open,
  onClose,
  onPick,
  taken,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (p: Player) => void;
  taken: string[];
  title: string;
}) {
  const { players, league, labsById } = useLeague();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...players]
      .filter((p) => !term || p.name.toLowerCase().includes(term))
      .sort((a, b) => {
        const la = league.players.get(a.id)?.lastPlayed ?? '';
        const lb = league.players.get(b.id)?.lastPlayed ?? '';
        return lb.localeCompare(la) || a.name.localeCompare(b.name);
      });
  }, [players, q, league]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="wood max-h-[85dvh] w-full max-w-lg overflow-hidden rounded-t-3xl p-1 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex max-h-[calc(85dvh-0.5rem)] flex-col rounded-t-[1.4rem] bg-felt p-4 sm:rounded-[1.4rem]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-score text-3xl tracking-wider">{title}</h3>
            <button className="text-3xl leading-none" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
          <input className="input mb-3" placeholder="Search name…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="grid flex-1 grid-cols-3 gap-2 overflow-y-auto pb-2 sm:grid-cols-4">
            <Link
              to="/players/new?back=game"
              className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/60 p-2 text-center text-xs font-bold"
            >
              <span className="text-3xl">➕</span>
              New player
            </Link>
            {list.map((p) => {
              const disabled = taken.includes(p.id);
              return (
                <button
                  key={p.id}
                  disabled={disabled}
                  onClick={() => {
                    onPick(p);
                    setQ('');
                  }}
                  className="flex flex-col items-center gap-1 rounded-xl bg-black/20 p-2 transition active:scale-95 disabled:opacity-30"
                >
                  <Avatar player={p} size={52} />
                  <span className="w-full truncate text-center text-sm font-bold">{p.name}</span>
                  <span className="w-full truncate text-center text-[10px] text-white/60">
                    {(p.lab_id && labsById.get(p.lab_id)?.name) || '–'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
