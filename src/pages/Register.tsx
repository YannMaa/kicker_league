import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { AVATAR_STYLES, avatarUri, randomSeed, type AvatarStyle } from '../lib/avatar';
import { useLeague } from '../lib/store';
import { NEW_PLAYER_KEY } from './NewGame';

const NEW_LAB = '__new__';
const seeds = () => Array.from({ length: 8 }, randomSeed);

export function Register() {
  const { labs, reload } = useLeague();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const backToGame = params.get('back') === 'game';

  const [name, setName] = useState('');
  const [labId, setLabId] = useState<string>('');
  const [newLab, setNewLab] = useState('');
  const [style, setStyle] = useState<AvatarStyle>('adventurer');
  const [options, setOptions] = useState<string[]>(seeds);
  const [seed, setSeed] = useState<string>(() => options[0]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sortedLabs = [...labs].sort((a, b) => a.name.localeCompare(b.name));
  const canSave = name.trim().length > 0 && (labId !== NEW_LAB || newLab.trim().length > 0) && !saving;

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
      const p = await api.addPlayer({ name, lab_id, avatar_style: style, avatar_seed: seed });
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
      <h1 className="mb-1 font-score text-4xl tracking-wider drop-shadow">Join the league</h1>
      <p className="mb-4 text-white/80">Create your profile and you are ready to play.</p>

      {/* Avatar-Vorschau */}
      <div className="mb-4 flex flex-col items-center">
        <img
          src={avatarUri(style, seed)}
          alt="Your avatar"
          className="h-32 w-32 rounded-full bg-white ring-4 ring-white shadow-lg"
        />
        <div className="mt-2 font-score text-3xl tracking-wider">{name.trim() || 'Your name'}</div>
      </div>

      <label className="mb-1 block text-sm font-bold uppercase tracking-widest text-white/80">Name</label>
      <input
        className="input mb-4"
        value={name}
        maxLength={30}
        placeholder="e.g. Foosball Frank"
        onChange={(e) => setName(e.target.value)}
        autoFocus
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

      <label className="mb-1 mt-4 block text-sm font-bold uppercase tracking-widest text-white/80">Avatar style</label>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(AVATAR_STYLES) as AvatarStyle[]).map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => setStyle(s)}
            className={`flex shrink-0 flex-col items-center rounded-xl p-1.5 text-[11px] font-bold ${
              style === s ? 'bg-white text-black' : 'bg-black/20'
            }`}
          >
            <img src={avatarUri(s, seed)} alt="" className="h-10 w-10 rounded-full bg-white" />
            {AVATAR_STYLES[s].label}
          </button>
        ))}
      </div>

      <div className="mb-1 flex items-center justify-between">
        <label className="text-sm font-bold uppercase tracking-widest text-white/80">Pick one</label>
        <button
          type="button"
          className="btn-ghost !py-1 text-sm"
          onClick={() => {
            const n = seeds();
            setOptions(n);
            setSeed(n[0]);
          }}
        >
          🎲 Roll again
        </button>
      </div>
      <div className="mb-6 grid grid-cols-4 gap-2">
        {options.map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => setSeed(s)}
            className={`rounded-full p-1 transition ${seed === s ? 'bg-yellow-300' : 'bg-transparent'}`}
          >
            <img src={avatarUri(style, s)} alt="" className="aspect-square w-full rounded-full bg-white" />
          </button>
        ))}
      </div>

      {err && <p className="mb-3 rounded-xl bg-red-600 p-3 font-semibold">{err}</p>}
      <button className="btn-ball w-full py-4 text-xl" disabled={!canSave}>
        {saving ? 'Saving…' : backToGame ? '✅ Create & back to match' : '✅ Create profile'}
      </button>
    </form>
  );
}
