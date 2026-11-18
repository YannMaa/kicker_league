import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type LeagueData } from './api';
import { computeLeague, type LeagueStats } from './rating';
import type { Lab, Player } from './types';

interface Store extends LeagueData {
  league: LeagueStats;
  playersById: Map<string, Player>;
  labsById: Map<string, Lab>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  demo: boolean;
}

const Ctx = createContext<Store | null>(null);

export function LeagueProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LeagueData>({ labs: [], players: [], games: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setData(await api.load());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    return api.subscribe(reload);
  }, [reload]);

  const value = useMemo<Store>(() => {
    // Elo wird über die komplette Historie berechnet (auch mit entfernten Spielern) …
    const games = data.games.filter((g) => !g.deleted_at); // gelöschte Spiele zählen nicht
    const full = computeLeague(data.players, games);
    const activePlayers = data.players.filter((p) => !p.archived_at);
    const activeIds = new Set(activePlayers.map((p) => p.id));
    // … entfernte Spieler erscheinen aber nirgends in Tabelle, Auswahl oder Insights.
    const league: LeagueStats = {
      ...full,
      players: new Map([...full.players].filter(([id]) => activeIds.has(id))),
    };
    return {
      ...data,
      games,
      players: activePlayers,
      league,
      // alle Spieler (auch entfernte), damit alte Spiele weiterhin Namen anzeigen
      playersById: new Map(data.players.map((p) => [p.id, p])),
      labsById: new Map(data.labs.map((l) => [l.id, l])),
      loading,
      error,
      reload,
      demo: api.demo,
    };
  }, [data, loading, error, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLeague(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useLeague außerhalb des Providers');
  return s;
}
