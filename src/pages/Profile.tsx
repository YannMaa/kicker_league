import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useLeague } from '../lib/store';
import { playerRelations } from '../lib/insights';
import { sideOf } from '../lib/rating';
import { Avatar } from '../components/Avatar';
import { EloChart } from '../components/EloChart';
import { GameRow } from '../components/GameRow';
import { Section } from '../components/Section';

export function Profile() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { playersById, labsById, league, games } = useLeague();
  const p = id ? playersById.get(id) : undefined;
  const s = id ? league.players.get(id) : undefined;
  if (!p || !s) return <p>Spieler nicht gefunden. <Link to="/tabelle" className="underline">Zur Tabelle</Link></p>;
  const mine = games.filter((g) => sideOf(g, p.id));
  const rel = playerRelations(p.id, games);
  const name = (pid: string) => playersById.get(pid)?.name ?? '?';
  const stat = (label: string, value: string | number) => (
    <div className="rounded-xl bg-black/25 p-2 text-center">
      <div className="scoreboard rounded-md text-3xl">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/70">{label}</div>
    </div>
  );
  return (
    <div>
      {params.get('neu') && (
        <div className="pitch-card mb-4 text-center">
          <p className="font-bold">Willkommen in der Liga, {p.name}! 🎉</p>
          <Link to="/spiel" className="btn-ball mt-2">⚽ Erstes Spiel eintragen</Link>
        </div>
      )}
      <div className="mb-4 flex items-center gap-4">
        <Avatar player={p} size={88} />
        <div>
          <h1 className="font-score text-5xl leading-none tracking-wider">{p.name}</h1>
          <div className="text-white/80">{(p.lab_id && labsById.get(p.lab_id)?.name) || 'Kein Lab'}</div>
          {s.provisional && <span className="rounded bg-yellow-300 px-1.5 text-xs font-extrabold text-black">ROOKIE (&lt; 5 Spiele)</span>}
        </div>
      </div>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {stat('Elo', Math.round(s.elo))}{stat('Siege', s.wins)}{stat('Spiele', s.games)}{stat('Quote', `${Math.round(s.bayes * 100)}%`)}
      </div>
      <Section title="Elo-Verlauf"><div className="pitch-card"><EloChart points={league.eloHistory.get(p.id) ?? []} /></div></Section>
      <Section title="Beziehungen">
        <div className="pitch-card space-y-2 text-sm">
          <div>🤝 Bester Partner: <b>{rel.bestPartner ? `${name(rel.bestPartner.playerId)} (${rel.bestPartner.wins}/${rel.bestPartner.games} Siege)` : 'noch offen'}</b></div>
          <div>😱 Angstgegner: <b>{rel.nemesis ? `${name(rel.nemesis.playerId)} (${rel.nemesis.wins}:${rel.nemesis.losses})` : 'keiner'}</b></div>
          <div>🍰 Lieblingsopfer: <b>{rel.favoriteVictim ? `${name(rel.favoriteVictim.playerId)} (${rel.favoriteVictim.wins}:${rel.favoriteVictim.losses})` : 'keins'}</b></div>
          <div>🔥 Längste Siegesserie: <b>{s.longestWinStreak}</b> · Tore: <b>{s.goalsFor}:{s.goalsAgainst}</b></div>
        </div>
      </Section>
      <Section title="Spiele">
        <div className="space-y-2">
          {[...mine].reverse().slice(0, 15).map((g) => <GameRow key={g.id} game={g} highlight={p.id} />)}
          {!mine.length && <p className="text-white/70">Noch keine Spiele.</p>}
        </div>
      </Section>
    </div>
  );
}
