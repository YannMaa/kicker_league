import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useLeague } from '../lib/store';
import { teamOf, winnerOf } from '../lib/rating';
import { LkGainRow } from '../components/LkGainRow';
import { Section } from '../components/Section';

export function MatchDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { games, loading, reload } = useLeague();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const game = games.find((g) => g.id === id);
  if (loading) return <p>Loading…</p>;
  if (!game)
    return (
      <div className="pitch-card text-center">
        <p className="mb-3">This match was not found. It may have been deleted.</p>
        <Link to="/" className="btn-ghost">Back to home</Link>
      </div>
    );

  const w = winnerOf(game);
  const winners = teamOf(game, w);
  const losers = teamOf(game, w === 'red' ? 'blue' : 'red');
  const when = new Date(game.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

  async function remove() {
    setBusy(true);
    setErr(null);
    try {
      await api.deleteGame(game!.id);
      await reload();
      nav('/');
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="text-center">
      <div className="text-sm text-white/70">{game.mode === '2v2' ? '2 vs 2' : '1 vs 1'} · {when}</div>
      <h1 className="mt-1 font-score text-5xl tracking-wider drop-shadow">Team {w === 'red' ? 'Black' : 'White'} wins!</h1>
      <div className="scoreboard mx-auto my-3 inline-block rounded-xl px-6 text-6xl">
        {game.score_red} : {game.score_blue}
      </div>
      <div className="text-xs text-white/60">Black {game.score_red} · White {game.score_blue}</div>

      <div className="mt-4 text-left">
        <Section title="LK points earned">
          <div className="space-y-2">
            {winners.map((pid) => <LkGainRow key={pid} game={game} id={pid} />)}
            <div className="rod my-2" />
            {losers.map((pid) => <LkGainRow key={pid} game={game} id={pid} />)}
          </div>
          <p className="mt-2 text-xs text-white/60">Only winners gain LK points, as in tennis.</p>
        </Section>
      </div>

      <div className="mt-6 border-t border-white/20 pt-4">
        {!confirming ? (
          <button className="text-sm text-white/70 underline" onClick={() => setConfirming(true)}>
            🗑 Delete this match
          </button>
        ) : (
          <div className="pitch-card space-y-3">
            <p className="text-sm">Delete this match? The table and LK ratings are recalculated.</p>
            {err && <p className="rounded-xl bg-red-600 p-2 text-sm font-semibold">{err}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>Cancel</button>
              <button className="btn-danger" onClick={remove} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
