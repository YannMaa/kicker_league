import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import {
  AVATAR_STYLES, CUSTOM_STYLES, DEFAULT_OPTIONS, HAIR_COLORS, MOODS, SKIN_TONES, avatarUri, randomSeed, type AvatarStyle,
} from '../lib/avatar';
import type { AvatarOptions, Player } from '../lib/types';
import { useLeague } from '../lib/store';
import { NEW_PLAYER_KEY } from '../pages/NewGame';

const NEW_LAB = '__new__';
const seeds = () => Array.from({ length: 8 }, randomSeed);

/**
 * Formular zum Registrieren (ohne `player`) und zum Bearbeiten (mit `player`).
 * Beim Bearbeiten lassen sich nur Name, Lab und Avatar ändern. Der Avatar bleibt unverändert,
 * solange in den Avatar-Feldern nichts angefasst wird.
 */
export function PlayerForm({ player, backToGame = false }: { player?: Player; backToGame?: boolean }) {
  const { labs, reload } = useLeague();
  const nav = useNavigate();
  const editing = !!player;

  const startStyle: AvatarStyle =
    player && CUSTOM_STYLES.includes(player.avatar_style as AvatarStyle) ? (player.avatar_style as AvatarStyle) : 'adventurer';
  const startOpts = player?.avatar_options ?? DEFAULT_OPTIONS;

  const [name, setName] = useState(player?.name ?? '');
  const [labId, setLabId] = useState<string>(player?.lab_id ?? '');
  const [newLab, setNewLab] = useState('');
  const [style, setStyle] = useState<AvatarStyle>(startStyle);
  const [skin, setSkin] = useState(startOpts.skinColor);
  const [hair, setHair] = useState(startOpts.hairColor);
  const [mood, setMood] = useState(startOpts.mood);
  const opts: AvatarOptions = { skinColor: skin, hairColor: hair, mood };
  const [options, setOptions] = useState<string[]>(() => (player ? [player.avatar_seed, ...seeds().slice(0, 7)] : seeds()));
  const [seed, setSeed] = useState<string>(() => player?.avatar_seed ?? options[0]);
  const [avatarChanged, setAvatarChanged] = useState(!editing);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const change = (fn: () => void) => {
    setAvatarChanged(true);
    fn();
  };

  const sortedLabs = [...labs].sort((a, b) => a.name.localeCompare(b.name));
  const canSave = name.trim().length > 0 && (labId !== NEW_LAB || newLab.trim().length > 0) && !saving;
  const previewSrc =
    player && !avatarChanged
      ? avatarUri(player.avatar_style, player.avatar_seed, player.avatar_options)
      : avatarUri(style, seed, opts);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setErr(null);
    try {
      let lab_id: string | null = labId || null;
      if (labId === NEW_LAB) {
        const existing = labs.find((l) => l.name.toLowerCase() === newLab.trim().toLowerCase());
        lab_id = existing ? existing.id : (await api.addLab(newLab)).id;
      }
      if (player) {
        await api.updatePlayer(player.id, {
          name,
          lab_id,
          ...(avatarChanged ? { avatar_style: style, avatar_seed: seed, avatar_options: opts } : {}),
        });
        await reload();
        nav(`/players/${player.id}`);
        return;
      }
      const p = await api.addPlayer({ name, lab_id, avatar_style: style, avatar_seed: seed, avatar_options: opts });
      await reload();
      if (backToGame) {
        try {
          sessionStorage.setItem(NEW_PLAYER_KEY, JSON.stringify(p.id));
        } catch {
          /* ignore */
        }
        nav('/game');
      } else nav(`/players/${p.id}?new=1`);
    } catch (e) {
      setErr((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h1 className="mb-1 font-score text-4xl tracking-wider drop-shadow">{editing ? 'Edit profile' : 'Join the league'}</h1>
      <p className="mb-4 text-white/80">
        {editing
          ? 'Change your name, lab or avatar. Nothing else can be changed.'
          : 'Create your profile and you are ready to play.'}
      </p>

      {/* Avatar-Vorschau */}
      <div className="mb-4 flex flex-col items-center">
        <img src={previewSrc} alt="Your avatar" className="h-32 w-32 rounded-full bg-white ring-4 ring-white shadow-lg" />
        <div className="mt-2 font-score text-3xl tracking-wider">{name.trim() || 'Your name'}</div>
      </div>

      <label className="mb-1 block text-sm font-bold uppercase tracking-widest text-white/80">Name</label>
      <input
        className="input mb-4"
        value={name}
        maxLength={30}
        placeholder="e.g. Foosball Frank"
        onChange={(e) => setName(e.target.value)}
        autoFocus={!editing}
      />

      <label className="mb-1 block text-sm font-bold uppercase tracking-widest text-white/80">Lab / Chair</label>
      <select className="input mb-2" value={labId} onChange={(e) => setLabId(e.target.value)}>
        <option value="">– no lab / guest –</option>
        {sortedLabs.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
        <option value={NEW_LAB}>➕ Add new lab…</option>
      </select>
      {labId === NEW_LAB && (
        <input
          className="input mb-2"
          value={newLab}
          maxLength={40}
          placeholder="Name of the lab"
          onChange={(e) => setNewLab(e.target.value)}
        />
      )}

      <div className="mb-1 mt-4 flex items-baseline justify-between gap-2">
        <label className="text-sm font-bold uppercase tracking-widest text-white/80">Avatar style</label>
        {editing && !avatarChanged && <span className="text-[11px] text-white/60">Current avatar stays unless you change it</span>}
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {CUSTOM_STYLES.map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => change(() => setStyle(s))}
            className={`flex shrink-0 flex-col items-center rounded-xl p-1.5 text-[11px] font-bold ${
              style === s ? 'bg-white text-black' : 'bg-black/20'
            }`}
          >
            <img src={avatarUri(s, seed, opts)} alt="" className="h-10 w-10 rounded-full bg-white" />
            {AVATAR_STYLES[s].label}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-sm font-bold uppercase tracking-widest text-white/80">Skin tone</label>
      <div className="mb-3 flex flex-wrap gap-2">
        {SKIN_TONES.map((c) => (
          <button
            type="button"
            key={c.id}
            title={c.label}
            aria-label={`Skin tone ${c.label}`}
            onClick={() => change(() => setSkin(c.id))}
            style={{ backgroundColor: `#${c.id}` }}
            className={`h-9 w-9 rounded-full border-2 border-black/30 ${skin === c.id ? 'ring-4 ring-yellow-300' : ''}`}
          />
        ))}
      </div>

      <label className="mb-1 block text-sm font-bold uppercase tracking-widest text-white/80">Hair color</label>
      <div className="mb-3 flex flex-wrap gap-2">
        {HAIR_COLORS.map((c) => (
          <button
            type="button"
            key={c.id}
            title={c.label}
            aria-label={`Hair color ${c.label}`}
            onClick={() => change(() => setHair(c.id))}
            style={{ backgroundColor: `#${c.id}` }}
            className={`h-9 w-9 rounded-full border-2 border-white/40 ${hair === c.id ? 'ring-4 ring-yellow-300' : ''}`}
          />
        ))}
      </div>

      <label className="mb-1 block text-sm font-bold uppercase tracking-widest text-white/80">Mood</label>
      <div className="mb-4 flex flex-wrap gap-2">
        {MOODS.map((m) => (
          <button
            type="button"
            key={m.id}
            onClick={() => change(() => setMood(m.id))}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${mood === m.id ? 'bg-white text-black' : 'bg-black/20'}`}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-bold uppercase tracking-widest text-white/80">Pick a look</label>
        <button
          type="button"
          className="btn-ghost !py-1 text-sm"
          onClick={() =>
            change(() => {
              const n = seeds();
              setOptions(n);
              setSeed(n[0]);
            })
          }
        >
          🎲 Roll again
        </button>
      </div>
      <div className="mb-6 grid grid-cols-4 gap-2">
        {options.map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => change(() => setSeed(s))}
            className={`rounded-full p-1 transition ${seed === s ? 'bg-yellow-300' : 'bg-transparent'}`}
          >
            <img src={avatarUri(style, s, opts)} alt="" className="aspect-square w-full rounded-full bg-white" />
          </button>
        ))}
      </div>

      {err && <p className="mb-3 rounded-xl bg-red-600 p-3 font-semibold">{err}</p>}
      <button className="btn-ball w-full py-4 text-xl" disabled={!canSave}>
        {saving ? 'Saving…' : editing ? '✅ Save changes' : backToGame ? '✅ Create & back to match' : '✅ Create profile'}
      </button>
      {editing && (
        <Link to={`/players/${player!.id}`} className="btn-ghost mt-3 w-full">
          Cancel
        </Link>
      )}
    </form>
  );
}
