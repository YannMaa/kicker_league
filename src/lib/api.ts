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

export interface Api {
  demo: boolean;
  load(): Promise<LeagueData>;
  addLab(name: string): Promise<Lab>;
  addPlayer(p: Pick<Player, 'name' | 'lab_id' | 'avatar_style' | 'avatar_seed'>): Promise<Player>;
  addGame(g: NewGame): Promise<Game>;
  deleteGame(id: string): Promise<void>;
  subscribe(onChange: () => void): () => void;
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function friendlyError(e: { message?: string; code?: string } | null): Error {
  const msg = e?.message ?? 'Unbekannter Fehler';
  if (e?.code === '23505') return new Error('Den Namen gibt es schon – bitte einen anderen wählen.');
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
    async addGame(g) {
      const { data, error } = await sb.from('games').insert(g).select().single();
      if (error) throw friendlyError(error);
      return data as Game;
    },
    async deleteGame(id) {
      const { data, error } = await sb.from('games').delete().eq('id', id).select();
      if (error) throw friendlyError(error);
      if (!data?.length) throw new Error('Rückgängig ist nur in den ersten 5 Minuten möglich.');
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
        throw new Error('Das Lab gibt es schon.');
      const lab = { id: id(), name: name.trim(), created_at: now() };
      state.labs.push(lab);
      save();
      return lab;
    },
    async addPlayer(p) {
      if (state.players.some((x) => x.name.toLowerCase() === p.name.trim().toLowerCase()))
        throw new Error('Den Namen gibt es schon – bitte einen anderen wählen.');
      const player = { ...p, name: p.name.trim(), id: id(), created_at: now() };
      state.players.push(player);
      save();
      return player;
    },
    async addGame(g) {
      const game = { ...g, id: id(), created_at: now() };
      state.games.push(game);
      save();
      return game;
    },
    async deleteGame(gid) {
      const g = state.games.find((x) => x.id === gid);
      if (!g || Date.now() - new Date(g.created_at).getTime() > 5 * 60_000)
        throw new Error('Rückgängig ist nur in den ersten 5 Minuten möglich.');
      state.games = state.games.filter((x) => x.id !== gid);
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
