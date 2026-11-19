import { useState } from 'react';
import { api } from '../lib/api';
import { useLeague } from '../lib/store';
import { GameRow } from './GameRow';
import { Section } from './Section';

const PAGE = 10;

/** Letzte Spiele mit Löschen-Funktion (Soft-Delete, Tabelle und LK werden neu berechnet). */
export function MatchHistory() {
  const { games, reload } = useLeague();
  const [limit, setLimit] = useState(PAGE);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const list = [...games].reverse();

  async function remove(id: string) {
    setBusy(true);
    setErr(null);
    try {
      await api.deleteGame(id);
      await reload();
      setConfirmId(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      <Section title="Recent matches">
        {err && <p className="mb-2 rounded-xl bg-red-600 p-2 text-sm font-semibold">{err}</p>}
        <div className="space-y-2">
          {list.slice(0, limit).map((g) => (
            <div key={g.id}>
              <GameRow game={g} />
              {confirmId === g.id ? (
                <div className="mt-1 rounded-xl bg-black/30 p-2 text-center text-sm">
                  <p className="mb-2">Delete this match? The table and LK ratings are recalculated.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="btn-ghost !py-2" onClick={() => setConfirmId(null)} disabled={busy}>
                      Cancel
                    </button>
                    <button className="btn-danger !py-2" onClick={() => remove(g.id)} disabled={busy}>
                      {busy ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-0.5 text-right">
                  <button
                    className="text-xs text-white/60 underline"
                    onClick={() => {
                      setErr(null);
                      setConfirmId(g.id);
                    }}
                  >
                    🗑 Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {!list.length && <p className="text-white/70">No matches yet.</p>}
        </div>
        {list.length > limit && (
          <button className="btn-ghost mt-3 w-full" onClick={() => setLimit((l) => l + PAGE)}>
            Show more ({list.length - limit} older)
          </button>
        )}
      </Section>
    </div>
  );
}
