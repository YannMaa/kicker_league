import { Link } from 'react-router-dom';
import { useLeague } from '../lib/store';
import { formatLk, sortRanking } from '../lib/rating';
import { Avatar } from '../components/Avatar';
import { GameRow } from '../components/GameRow';
import { Section } from '../components/Section';

export function Home() {
  const { league, playersById, games, loading } = useLeague();
  const ranking = sortRanking([...league.players.values()].filter((s) => s.games > 0)).slice(0, 3);
  const recent = [...games].reverse().slice(0, 5);
  const order = [1, 0, 2]; // podium: 2nd – 1st – 3rd
  const medal = ['🥇', '🥈', '🥉'];
  return (
    <div>
      <Section title="Podium">
        {loading ? (
          <p>Loading…</p>
        ) : ranking.length === 0 ? (
          <div className="pitch-card text-center">
            <p className="mb-3">No matches yet. Be the first!</p>
            <Link to="/players/new" className="btn-ghost">Add player</Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 items-end gap-2">
            {order.filter((i) => ranking[i]).map((i) => {
              const s = ranking[i];
              const p = playersById.get(s.playerId)!;
              return (
                <Link key={s.playerId} to={`/players/${p.id}`} className="flex flex-col items-center">
                  <span className="text-3xl">{medal[i]}</span>
                  <Avatar player={p} size={i === 0 ? 80 : 60} />
                  <span className="mt-1 max-w-full truncate font-extrabold">{p.name}</span>
                  <div className={`wood mt-1 flex w-full items-center justify-center rounded-t-lg font-score text-3xl ${i === 0 ? 'h-20' : i === 1 ? 'h-14' : 'h-10'}`}>
                    {formatLk(s.lk)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Recent matches" right={<Link to="/table" className="text-sm underline">Table →</Link>}>
        <div className="space-y-2">
          {recent.map((g) => <GameRow key={g.id} game={g} to={`/matches/${g.id}`} />)}
          {!recent.length && <p className="text-white/70">Nothing played yet.</p>}
        </div>
        {games.length > 0 && (
          <Link to="/matches" className="btn-ghost mt-3 w-full">
            Show all matches →
          </Link>
        )}
      </Section>
    </div>
  );
}
