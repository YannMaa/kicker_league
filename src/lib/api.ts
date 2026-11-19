/**
 * Datenzugriff. Mit gesetzten VITE_SUPABASE_* Variablen → Supabase.
 * Ohne → Demo-Modus mit Beispieldaten im localStorage (zum Ausprobieren).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Game, Lab, NewGame, Player } from './types';
import { demoData } from './demo';

export interface LeagueData {
  labs: Lab[];
  players: Player[];
  games: Game[];
}

export type PlayerPatch = Partial<Pick<Player, 'name' | 'lab_id' | 'avatar_style' | 'avatar_seed' | 'avatar_options'>>;

export interface Api {
  demo: boolean;
  load(): Promise<LeagueData>;
  addLab(name: string): Promise<Lab>;
  addPlayer(p: Pick<Player, 'name' | 'lab_id' | 'avatar_style' | 'avatar_seed' | 'avatar_options'>): Promise<Player>;
  updatePlayer(id: string, patch: PlayerPatch): Promise<Player>;
  archivePlayer(id: string): Promise<void>;
  addGame(g: NewGame): Promise<Game>;
  deleteGame(id: string): Promise<void>;
  subscribe(onChange: () => void): () => void;
}

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
// Nur die Basisadresse verwenden (falls versehentlich /rest/v1/ o.ä. mitkopiert wurde)
const url = rawUrl ? new URL(rawUrl).origin : undefined;

function friendlyError(e: { message?: string; code?: string } | null): Error {
  const msg = e?.message ?? 'Unknown error';
  if (e?.code === '23505') return new Error('That name is already taken – please pick another one.');
  return new Error(msg);
}

/** Supabase begrenzt Abfragen auf 1000 Zeilen → seitenweise laden. */
async function fetchAll<T>(sb: SupabaseClient, table: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select('*').order('created_at').range(from, from + 999);
    if (error) throw friendlyError(error);
    out.push(...(data as T[]));
    if (!data || data.length < 1000) return out;
  }
}

function supabaseApi(sb: SupabaseClient): Api {
  return {
    demo: false,
    async load() {
      const [labs, players, games] = await Promise.all([
        fetchAll<Lab>(sb, 'labs'),
        fetchAll<Player>(sb, 'players'),
        fetchAll<Game>(sb, 'games'),
      ]);
      return { labs, players, games };
    },
    async addLab(name) {
      const { data, error } = await sb.from('labs').insert({ name: name.trim() }).select().single();
      if (error) throw friendlyError(error);
      return data as Lab;
    },
    async addPlayer(p) {
      const { data, error } = await sb.from('players').insert({ ...p, name: p.name.trim() }).select().single();
      if (error) throw friendlyError(error);
      return data as Player;
    },
    async updatePlayer(id, patch) {
      const body = { ...patch, ...(patch.name !== undefined ? { name: patch.name.trim() } : {}) };
      const { data, error } = await sb.from('players').update(body).eq('id', id).select();
      if (error) throw friendlyError(error);
      if (!data?.length) throw new Error('Could not save the changes (was the player removed?).');
      return data[0] as Player;
    },
    async archivePlayer(id) {
      const { data, error } = await sb
        .from('players')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id)
        .select();
      if (error) throw friendlyError(error);
      if (!data?.length) throw new Error('Could not remove this player (already removed?).');
    },
    async addGame(g) {
      const { data, error } = await sb.from('games').insert(g).select().single();
      if (error) throw friendlyError(error);
      return data as Game;
    },
    async deleteGame(id) {
      const { data, error } = await sb
        .from('games')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .select();
      if (error) throw friendlyError(error);
      if (!data?.length) throw new Error('Could not delete this match (already deleted?).');
    },
    subscribe(onChange) {
      // Leichtgewichtig: alle 30 s und beim Zurückkehren in den Tab neu laden.
      const iv = setInterval(onChange, 30_000);
      const vis = () => document.visibilityState === 'visible' && onChange();
      document.addEventListener('visibilitychange', vis);
      return () => {
        clearInterval(iv);
        document.removeEventListener('visibilitychange', vis);
      };
    },
  };
}

const DEMO_KEY = 'kicker-demo-v1';
function demoApi(): Api {
  const read = (): LeagueData => {
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return demoData();
  };
  let state = read();
  const save = () => {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  };
  const id = () => crypto.randomUUID();
  const now = () => new Date().toISOString();
  return {
    demo: true,
    async load() {
      return structuredClone(state);
    },
    async addLab(name) {
      if (state.labs.some((l) => l.name.toLowerCase() === name.trim().toLowerCase()))
        throw new Error('That lab already exists.');
      const lab = { id: id(), name: name.trim(), created_at: now() };
      state.labs.push(lab);
      save();
      return lab;
    },
    async addPlayer(p) {
      if (state.players.some((x) => x.name.toLowerCase() === p.name.trim().toLowerCase()))
        throw new Error('That name is already taken – please pick another one.');
      const player = { ...p, name: p.name.trim(), id: id(), created_at: now(), archived_at: null };
      state.players.push(player);
      save();
      return player;
    },
    async updatePlayer(pid, patch) {
      const pl = state.players.find((x) => x.id === pid && !x.archived_at);
      if (!pl) throw new Error('Player not found.');
      const nm = patch.name?.trim();
      if (nm !== undefined && state.players.some((x) => x.id !== pid && !x.archived_at && x.name.toLowerCase() === nm.toLowerCase()))
        throw new Error('That name is already taken – please pick another one.');
      Object.assign(pl, patch, nm !== undefined ? { name: nm } : {});
      save();
      return { ...pl };
    },
    async archivePlayer(pid) {
      const pl = state.players.find((x) => x.id === pid);
      if (!pl) throw new Error('Player not found.');
      pl.archived_at = now();
      save();
    },
    async addGame(g) {
      const game = { ...g, id: id(), created_at: now(), deleted_at: null };
      state.games.push(game);
      save();
      return game;
    },
    async deleteGame(gid) {
      const g = state.games.find((x) => x.id === gid);
      if (!g) throw new Error('Match not found.');
      g.deleted_at = now();
      save();
    },
    subscribe() {
      return () => {};
    },
  };
}

export function resetDemo() {
  try {
    localStorage.removeItem(DEMO_KEY);
  } catch {
    /* ignore */
  }
}

export const api: Api = url && key ? supabaseApi(createClient(url, key)) : demoApi();
