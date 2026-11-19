import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useLeague } from '../lib/store';
import { playerRelations } from '../lib/insights';
import { formatLk, sideOf } from '../lib/rating';
import { Avatar } from '../components/Avatar';
import { LkChart } from '../components/LkChart';
import { GameRow } from '../components/GameRow';
import { Section } from '../components/Section';

export function Profile() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { playersById, labsById, league, games, reload, loading } = useLeague();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const p = id ? playersById.get(id) : undefined;
  const s = id ? league.players.get(id) : undefined;
  if (loading) return <p>Loading…</p>;
  if (!p) return <p>Player not found. <Link to="/table" className="underline">Back to the table</Link></p>;
  if (!s)
    return (
      <div className="pitch-card text-center">
        <p className="mb-3">{p.name} has been removed from the league.</p>
        <Link to="/table" className="btn-ghost">Back to the table</Link>
      </div>
    );

  const mine = games.filter((g) => sideOf(g, p.id));
  const rel = playerRelations(p.id, games);
  const name = (pid: string) => playersById.get(pid)?.name ?? '?';
  const stat = (label: string, value: string | number) => (
    <div className="rounded-xl bg-black/25 p-2 text-center">
      <div className="scoreboard rounded-md text-3xl">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/70">{label}</div>
    </div>
  );

  async function remove() {
    setBusy(true);
    setErr(null);
    try {
      await api.archivePlayer(p!.id);
      await reload();
      nav('/table');
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div>
      {params.get('new') && (
        <div className="pitch-card mb-4 text-center">
          <p className="font-bold">Welcome to the league, {p.name}! 🎉</p>
          <Link to="/game" className="btn-ball mt-2">⚽ Log your first match</Link>
        </div>
      )}
      <div className="mb-4 flex items-center gap-4">
        <Avatar player={p} size={88} />
        <div>
          <h1 className="font-score text-5xl leading-none tracking-wider">{p.name}</h1>
          <div className="text-white/80">{(p.lab_id && labsById.get(p.lab_id)?.name) || 'No lab'}</div>
          {s.provisional && <span className="rounded bg-yellow-300 px-1.5 text-xs font-extrabold text-black">ROOKIE (&lt; 5 matches)</span>}
        </div>
      </div>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {stat('LK', formatLk(s.lk))}{stat('Wins', s.wins)}{stat('Matches', s.games)}{stat('Goal diff', s.diff > 0 ? `+${s.diff}` : s.diff)}
      </div>
      <Section title="LK history"><div className="pitch-card"><LkChart points={league.lkHistory.get(p.id) ?? []} /></div></Section>
      <Section title="Relationships">
        <div className="pitch-card space-y-2 text-sm">
          <div>🤝 Best partner: <b>{rel.bestPartner ? `${name(rel.bestPartner.playerId)} (${rel.bestPartner.wins}/${rel.bestPartner.games} wins)` : 'still open'}</b></div>
          <div>😱 Nemesis: <b>{rel.nemesis ? `${name(rel.nemesis.playerId)} (${rel.nemesis.wins}:${rel.nemesis.losses})` : 'none'}</b></div>
          <div>🍰 Favorite victim: <b>{rel.favoriteVictim ? `${name(rel.favoriteVictim.playerId)} (${rel.favoriteVictim.wins}:${rel.favoriteVictim.losses})` : 'none'}</b></div>
          <div>🔥 Longest win streak: <b>{s.longestWinStreak}</b> · Goals: <b>{s.goalsFor}:{s.goalsAgainst}</b></div>
        </div>
      </Section>
      <Section title="Matches">
        <div className="space-y-2">
          {[...mine].reverse().slice(0, 15).map((g) => <GameRow key={g.id} game={g} highlight={p.id} />)}
          {!mine.length && <p className="text-white/70">No matches yet.</p>}
        </div>
      </Section>

      <div className="mt-8 border-t border-white/20 pt-4 text-center">
        {!confirming ? (
          <button className="text-sm text-white/70 underline" onClick={() => setConfirming(true)}>
            Remove this player
          </button>
        ) : (
          <div className="pitch-card space-y-3">
            <p className="font-bold">Remove {p.name} from the league?</p>
            <p className="text-sm text-white/80">
              They disappear from the table, rankings and insights. Past matches stay in the history so other players&apos; stats do not change.
            </p>
            {err && <p className="rounded-xl bg-red-600 p-2 text-sm font-semibold">{err}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
              <button className="btn-danger" onClick={remove} disabled={busy}>{busy ? 'Removing…' : 'Yes, remove'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
