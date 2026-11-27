import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeague } from '../lib/store';
import { GameRow } from '../components/GameRow';
import { Section } from '../components/Section';

const PAGE = 30;

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

/** Alle Spiele, neueste zuerst, nach Tagen gruppiert. Klick öffnet die Spielseite. */
export function AllMatches() {
  const { games, loading } = useLeague();
  const [limit, setLimit] = useState(PAGE);
  if (loading) return <p>Loading…</p>;

  const newestFirst = [...games].reverse();
  const days: { label: string; games: typeof games }[] = [];
  for (const g of newestFirst.slice(0, limit)) {
    const label = dayLabel(g.created_at);
    if (days[days.length - 1]?.label !== label) days.push({ label, games: [] });
    days[days.length - 1].games.push(g);
  }

  return (
    <div>
      <h1 className="font-score text-4xl tracking-wider drop-shadow">All matches</h1>
      <p className="mb-4 text-white/80">
        {games.length} {games.length === 1 ? 'match' : 'matches'} played
      </p>
      {days.map((d) => (
        <Section key={d.label} title={d.label}>
          <div className="space-y-2">
            {d.games.map((g) => (
              <GameRow key={g.id} game={g} to={`/matches/${g.id}`} />
            ))}
          </div>
        </Section>
      ))}
      {!games.length && <p className="pitch-card text-center">Nothing played yet.</p>}
      {games.length > limit && (
        <button className="btn-ghost w-full" onClick={() => setLimit((l) => l + PAGE)}>
          Show more ({games.length - limit} older)
        </button>
      )}
      <div className="mt-4 text-center">
        <Link to="/" className="text-sm underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
