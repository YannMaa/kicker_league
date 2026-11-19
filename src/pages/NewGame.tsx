import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useLeague } from '../lib/store';
import { resultQuip } from '../lib/insights';
import { formatLk, teamOf, winnerOf } from '../lib/rating';
import type { Game, Mode, Side } from '../lib/types';
import { Avatar } from '../components/Avatar';
import { PlayerPicker } from '../components/PlayerPicker';
import { ScoreCounter } from '../components/ScoreCounter';
import { MatchHistory } from '../components/MatchHistory';

type Slot = 'red_1' | 'red_2' | 'blue_1' | 'blue_2';
interface Draft {
  mode: Mode;
  slots: Record<Slot, string | null>;
  red: number;
  blue: number;
}

const DRAFT_KEY = 'kicker-draft';
export const PENDING_SLOT_KEY = 'kicker-pending-slot';
export const NEW_PLAYER_KEY = 'kicker-new-player';

const emptyDraft = (): Draft => ({ mode: '2v2', slots: { red_1: null, red_2: null, blue_1: null, blue_2: null }, red: 0, blue: 0 });

function ss<T>(key: string): T | null {
  try {
    const v = sessionStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function ssSet(key: string, v: unknown) {
  try {
    if (v === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

const slotLabel: Record<Slot, string> = {
  red_1: 'Defense',
  red_2: 'Attack',
  blue_1: 'Defense',
  blue_2: 'Attack',
};

export function NewGame() {
  const { playersById, reload, league } = useLeague();
  // Entfernte Spieler (z.B. aus einem gespeicherten Entwurf) zählen als leerer Slot
  const isActive = (id: string | null) => !!id && league.players.has(id);
  const [draft, setDraft] = useState<Draft>(() => {
    const d = ss<Draft>(DRAFT_KEY) ?? emptyDraft();
    // Frisch registrierte:n Spieler:in direkt in den gewählten Slot setzen
    const newId = ss<string>(NEW_PLAYER_KEY);
    const slot = ss<Slot>(PENDING_SLOT_KEY);
    if (newId && slot && !Object.values(d.slots).includes(newId)) d.slots[slot] = newId;
    ssSet(NEW_PLAYER_KEY, null);
    ssSet(PENDING_SLOT_KEY, null);
    return d;
  });
  const [picking, setPicking] = useState<Slot | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<Game | null>(null);

  useEffect(() => ssSet(DRAFT_KEY, draft), [draft]);
  useEffect(() => {
    if (picking) ssSet(PENDING_SLOT_KEY, picking);
  }, [picking]);

  const activeSlots: Slot[] = draft.mode === '2v2' ? ['red_1', 'red_2', 'blue_1', 'blue_2'] : ['red_1', 'blue_1'];
  const taken = activeSlots.map((s) => draft.slots[s]).filter((x): x is string => isActive(x));
  const complete = activeSlots.every((s) => isActive(draft.slots[s]));
  const valid = complete && draft.red !== draft.blue;

  const setSlot = (slot: Slot, id: string | null) => setDraft((d) => ({ ...d, slots: { ...d.slots, [slot]: id } }));
  const swapSides = () =>
    setDraft((d) => ({
      ...d,
      slots: { red_1: d.slots.blue_1, red_2: d.slots.blue_2, blue_1: d.slots.red_1, blue_2: d.slots.red_2 },
      red: d.blue,
      blue: d.red,
    }));

  async function save() {
    if (!valid) return;
    setSaving(true);
    setErr(null);
    try {
      const two = draft.mode === '2v2';
      const g = await api.addGame({
        mode: draft.mode,
        red_1: draft.slots.red_1!,
        red_2: two ? draft.slots.red_2 : null,
        blue_1: draft.slots.blue_1!,
        blue_2: two ? draft.slots.blue_2 : null,
        score_red: draft.red,
        score_blue: draft.blue,
      });
      await reload();
      setSaved(g);
      setDraft((d) => ({ ...d, red: 0, blue: 0 }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return <SavedScreen game={saved} onUndo={() => setSaved(null)} onAgain={() => setSaved(null)} key={saved.id} />;
  }

  const slotButton = (slot: Slot, side: Side) => {
    const p = isActive(draft.slots[slot]) ? playersById.get(draft.slots[slot]!) : null;
    const s = p ? league.players.get(p.id) : null;
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setPicking(slot)}
          className={`flex w-full flex-col items-center gap-1 rounded-2xl border-2 p-2 transition active:scale-95 ${
            p ? 'border-white/80 bg-black/25' : 'border-dashed border-white/60 bg-black/10'
          }`}
        >
          {draft.mode === '2v2' && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">{slotLabel[slot]}</span>
          )}
          <Avatar player={p} size={56} ring={side} />
          <span className="w-full truncate text-center text-sm font-extrabold">{p?.name ?? 'Pick player'}</span>
          {s && <span className="text-[10px] text-white/60">LK {formatLk(s.lk)}</span>}
        </button>
        {p && (
          <button
            type="button"
            onClick={() => setSlot(slot, null)}
            className="absolute -right-1 -top-1 h-6 w-6 rounded-full bg-black/70 text-sm"
            aria-label="Remove"
          >
            ×
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <h1 className="mb-3 font-score text-4xl tracking-wider drop-shadow">Log a match</h1>

      {/* Modus */}
      <div className="wood mb-4 grid grid-cols-2 gap-1 rounded-2xl p-1">
        {(['2v2', '1v1'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setDraft((d) => ({ ...d, mode: m }))}
            className={`rounded-xl py-2 font-score text-2xl tracking-wider transition ${
              draft.mode === m ? 'bg-white text-black' : 'text-white/90'
            }`}
          >
            {m === '2v2' ? '2 vs 2' : '1 vs 1'}
          </button>
        ))}
      </div>

      {/* Spielfeld */}
      <div className="relative overflow-hidden rounded-3xl border-4 border-white/80 bg-felt-light/40 p-3">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/70" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/70" />
        <div className="relative grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="rounded-lg border-2 border-white/60 bg-team-black py-1 text-center font-score text-xl tracking-widest text-white">TEAM BLACK</div>
            {slotButton('red_1', 'red')}
            {draft.mode === '2v2' && slotButton('red_2', 'red')}
          </div>
          <div className="space-y-2">
            <div className="rounded-lg bg-team-white py-1 text-center font-score text-xl tracking-widest text-black">TEAM WHITE</div>
            {slotButton('blue_1', 'blue')}
            {draft.mode === '2v2' && slotButton('blue_2', 'blue')}
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-2 gap-4">
          <ScoreCounter side="red" value={draft.red} onChange={(v) => setDraft((d) => ({ ...d, red: v }))} />
          <ScoreCounter side="blue" value={draft.blue} onChange={(v) => setDraft((d) => ({ ...d, blue: v }))} />
        </div>
      </div>

      <div className="mt-3 flex justify-center">
        <button className="text-sm font-bold text-white/80 underline" onClick={swapSides}>
          ⇄ Swap sides
        </button>
      </div>

      {err && <p className="mt-3 rounded-xl bg-red-600 p-3 font-semibold">{err}</p>}
      {complete && draft.red === draft.blue && (
        <p className="mt-3 text-center text-sm text-yellow-200">No draws in foosball. Keep playing! 😉</p>
      )}

      <button className="btn-ball mt-4 w-full py-4 text-xl" disabled={!valid || saving} onClick={save}>
        {saving ? 'Saving…' : '✅ Save result'}
      </button>

      <MatchHistory />

      <PlayerPicker
        open={!!picking}
        title={picking ? `${picking.startsWith('red') ? 'Black' : 'White'}${draft.mode === '2v2' ? ' – ' + slotLabel[picking] : ''}` : ''}
        taken={taken}
        onClose={() => setPicking(null)}
        onPick={(p) => {
          if (picking) setSlot(picking, p.id);
          setPicking(null);
          ssSet(PENDING_SLOT_KEY, null);
        }}
      />
    </div>
  );
}

function SavedScreen({ game, onUndo, onAgain }: { game: Game; onUndo: () => void; onAgain: () => void }) {
  const { playersById, league, reload } = useLeague();
  const [err, setErr] = useState<string | null>(null);
  const w = winnerOf(game);
  const r = league.gameRatings.get(game.id);
  const underdog = !!r && r.lkDiff >= 2; // Sieger war mind. 2 LK-Stufen schwächer
  const winners = teamOf(game, w);
  const losers = teamOf(game, w === 'red' ? 'blue' : 'red');

  async function undo() {
    try {
      await api.deleteGame(game.id);
      await reload();
      onUndo();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const row = (id: string) => {
    const p = playersById.get(id);
    const gain = r?.gains[id] ?? 0;
    const s = league.players.get(id);
    return (
      <Link to={`/players/${id}`} key={id} className="flex items-center gap-3 rounded-xl bg-black/20 p-2">
        <Avatar player={p} size={40} />
        <span className="flex-1 font-bold">{p?.name}</span>
        <span className="text-sm text-white/70">{s ? `LK ${formatLk(s.lk)}` : ''}</span>
        <span className={`w-20 text-right font-score text-2xl ${gain > 0 ? 'text-lime-300' : 'text-white/40'}`}>
          {gain > 0 ? `▲ ${gain.toFixed(2)}` : '–'}
        </span>
      </Link>
    );
  };

  return (
    <div className="text-center">
      <div className="mb-2 text-6xl">{underdog ? '🐶' : '🏆'}</div>
      <h1 className="font-score text-5xl tracking-wider drop-shadow">
        Team {w === 'red' ? 'Black' : 'White'} wins!
      </h1>
      <div className="scoreboard mx-auto my-3 inline-block rounded-xl px-6 text-6xl">
        {game.score_red} : {game.score_blue}
      </div>
      <p className="mx-auto mb-4 max-w-sm text-lg font-semibold">{resultQuip(game, underdog)}</p>

      <div className="pitch-card mb-4 space-y-2 text-left">
        <div className="text-xs font-bold uppercase tracking-widest text-white/70">LK changes (only winners move, as in tennis)</div>
        {winners.map(row)}
        <div className="rod my-2" />
        {losers.map(row)}
      </div>

      {err && <p className="mb-3 rounded-xl bg-red-600 p-3 font-semibold">{err}</p>}
      <div className="grid gap-3">
        <button className="btn-ball py-4 text-lg" onClick={onAgain}>
          🔁 Rematch (same teams)
        </button>
        <Link to="/tabelle" className="btn-ghost">
          📊 To the table
        </Link>
        <button className="text-sm text-white/70 underline" onClick={undo}>
          Mistake? Undo this match
        </button>
      </div>
    </div>
  );
}
