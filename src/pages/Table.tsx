import { Link } from 'react-router-dom';
import { useLeague } from '../lib/store';
import { LK_WEEKLY_SURCHARGE, formatLk, sortRanking } from '../lib/rating';
import { Avatar } from '../components/Avatar';
import { Diff, FormDots } from '../components/Form';

export function Table() {
  const { league, playersById, labsById } = useLeague();
  const all = [...league.players.values()];
  const rows = sortRanking(all);
  return (
    <div>
      <h1 className="mb-3 font-score text-4xl tracking-wider drop-shadow">Table</h1>
      <div className="overflow-x-auto rounded-2xl border-2 border-white/70 bg-black/20">
        <table className="w-full min-w-[30rem] text-sm">
          <thead className="bg-black/40 text-xs uppercase tracking-wider text-white/80">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Player</th>
              <th className="p-2" title="LK 1.5 = strongest, 25 = weakest">LK</th>
              <th className="p-2">Wins</th><th className="p-2">Losses</th>
              <th className="p-2">Goals</th><th className="p-2" title="Goal difference">Goal Diff</th>
              <th className="p-2">Form</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => {
              const p = playersById.get(s.playerId);
              if (!p) return null;
              return (
                <tr key={s.playerId} className={`border-t border-white/10 text-center`}>
                  <td className="p-2 text-left font-score text-xl">{i + 1}</td>
                  <td className="p-2 text-left">
                    <Link to={`/players/${p.id}`} className="flex items-center gap-2">
                      <Avatar player={p} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{p.name}</span>
                        <span className="block truncate text-[10px] text-white/60">{(p.lab_id && labsById.get(p.lab_id)?.name) || '–'}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-2 font-score text-xl text-yellow-300">{formatLk(s.lk)}</td>
                  <td className="p-2">{s.wins}</td><td className="p-2">{s.losses}</td>
                  <td className="p-2">{s.goalsFor}:{s.goalsAgainst}</td>
                  <td className="p-2"><Diff value={s.diff} /></td>
                  <td className="p-2"><FormDots form={s.form} /></td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={8} className="p-6 text-center text-white/70">No players yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-white/70">
        Sorted by LK (best first), ties by wins, then goal difference. LK works like in tennis: LK 1.5 is the best, 25 the worst, everyone starts at 24. Only winners improve, by points ÷ hurdle (beating stronger opponents is worth more, in doubles each winner gets half); every Monday all LKs get {LK_WEEKLY_SURCHARGE} worse (up to 25). Tap a player to see their profile.
      </p>
    </div>
  );
}
