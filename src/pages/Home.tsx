import { Link } from 'react-router-dom';
import { useLeague } from '../lib/store';
import { sortRanking } from '../lib/rating';
import { Avatar } from '../components/Avatar';
import { GameRow } from '../components/GameRow';
import { Section } from '../components/Section';

export function Home() {
  const { league, playersById, games, players, loading } = useLeague();
  const ranking = sortRanking([...league.players.values()].filter((s) => s.games > 0)).slice(0, 3);
  const recent = [...games].reverse().slice(0, 5);
  const order = [1, 0, 2]; // Podest: 2. – 1. – 3.
  const medal = ['🥇', '🥈', '🥉'];
  return (
    <div>
      <Link to="/spiel" className="btn-ball mb-6 w-full !py-6 text-3xl shadow-[0_6px_0_#94a3b8]">
        ⚽ Spiel eintragen
      </Link>

      <Section title="Podest">
        {loading ? (
          <p>Lade…</p>
        ) : ranking.length === 0 ? (
          <div className="pitch-card text-center">
            <p className="mb-3">Noch keine Spiele. Sei der Erste!</p>
            <Link to="/spieler/neu" className="btn-ghost">Spieler anlegen</Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 items-end gap-2">
            {order.filter((i) => ranking[i]).map((i) => {
              const s = ranking[i];
              const p = playersById.get(s.playerId)!;
              return (
                <Link key={s.playerId} to={`/spieler/${p.id}`} className="flex flex-col items-center">
                  <span className="text-3xl">{medal[i]}</span>
                  <Avatar player={p} size={i === 0 ? 80 : 60} />
                  <span className="mt-1 max-w-full truncate font-extrabold">{p.name}</span>
                  <div className={`wood mt-1 flex w-full items-center justify-center rounded-t-lg font-score text-3xl ${i === 0 ? 'h-20' : i === 1 ? 'h-14' : 'h-10'}`}>
                    {Math.round(s.elo)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Letzte Spiele" right={<Link to="/tabelle" className="text-sm underline">Tabelle →</Link>}>
        <div className="space-y-2">
          {recent.map((g) => <GameRow key={g.id} game={g} />)}
          {!recent.length && <p className="text-white/70">Noch nichts gespielt.</p>}
        </div>
      </Section>

      <div className="pitch-card text-center">
        <p className="mb-2 font-bold">{players.length} Spieler · {games.length} Spiele</p>
        <Link to="/spieler/neu" className="btn-ghost">➕ Neu hier? Registrieren</Link>
      </div>
    </div>
  );
}
