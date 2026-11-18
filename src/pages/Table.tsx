import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeague } from '../lib/store';
import { sortRanking, sortTable } from '../lib/rating';
import { Avatar } from '../components/Avatar';
import { Diff, FormDots } from '../components/Form';

export function Table() {
  const { league, playersById, labsById } = useLeague();
  const [mode, setMode] = useState<'table' | 'elo'>('table');
  const all = [...league.players.values()];
  const rows = mode === 'table' ? sortTable(all) : sortRanking(all);
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return (
    <div>
      <h1 className="mb-3 font-score text-4xl tracking-wider drop-shadow">{mode === 'table' ? 'League table' : 'Elo ranking'}</h1>
      <div className="wood mb-4 grid grid-cols-2 gap-1 rounded-2xl p-1">
        {([['table', 'Table (points)'], ['elo', 'Ranking (Elo)']] as const).map(([m, l]) => (
          <button key={m} onClick={() => setMode(m)} className={`rounded-xl py-2 font-bold ${mode === m ? 'bg-white text-black' : 'text-white/90'}`}>{l}</button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border-2 border-white/70 bg-black/20">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="bg-black/40 text-xs uppercase tracking-wider text-white/80">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Player</th>
              <th className="p-2" title="Played">P</th><th className="p-2" title="Wins">W</th><th className="p-2" title="Losses">L</th>
              <th className="p-2">Goals</th><th className="p-2" title="Goal difference">GD</th>
              <th className="p-2" title="Points">Pts</th>
              <th className="p-2">Elo</th>
              {mode === 'elo' && <th className="p-2">Win %</th>}
              <th className="p-2">Form</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const p = playersById.get(s.playerId);
              if (!p) return null;
              return (
                <tr key={s.playerId} className={`border-t border-white/10 text-center ${s.provisional && mode === 'elo' ? 'opacity-60' : ''}`}>
                  <td className="p-2 text-left font-score text-xl">{i + 1}</td>
                  <td className="p-2 text-left">
                    <Link to={`/players/${p.id}`} className="flex items-center gap-2">
                      <Avatar player={p} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{p.name}{s.provisional && <span className="ml-1 rounded bg-yellow-300 px-1 text-[9px] font-extrabold text-black">ROOKIE</span>}</span>
                        <span className="block truncate text-[10px] text-white/60">{(p.lab_id && labsById.get(p.lab_id)?.name) || '–'}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-2">{s.games}</td><td className="p-2">{s.wins}</td><td className="p-2">{s.losses}</td>
                  <td className="p-2">{s.goalsFor}:{s.goalsAgainst}</td>
                  <td className="p-2"><Diff value={s.diff} /></td>
                  <td className="p-2 font-score text-xl text-yellow-300">{s.points}</td>
                  <td className="p-2 font-bold">{Math.round(s.elo)}</td>
                  {mode === 'elo' && <td className="p-2">{pct(s.bayes)}</td>}
                  <td className="p-2"><FormDots form={s.form} /></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={11} className="p-6 text-center text-white/70">No players yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-white/70">
        Table: win = 1 point, then goal difference. Elo accounts for opponent strength and margin of victory; under 5 matches you are a rookie.
        Win % is smoothed (1 win from 1 match ≠ 100 %). Tap a player to see their profile.
      </p>
    </div>
  );
}
