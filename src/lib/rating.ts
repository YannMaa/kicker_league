/**
 * Rating-Logik der AIBE Kicker-Liga.
 *
 * Alles hier sind reine Funktionen über die Rohdaten (players + games).
 * Dadurch lassen sich ALLE Statistiken jederzeit aus dem Backup neu berechnen –
 * auch wenn die Formel später geändert wird.
 */
import type { Game, Player, Side } from './types';

export const ELO_START = 1000;
export const ELO_K_ROOKIE = 40; // die ersten ROOKIE_K_GAMES Spiele
export const ELO_K_PRO = 24;
export const ROOKIE_K_GAMES = 10;
/** Unter so vielen Spielen gilt man als "vorläufig" (Rookie). */
export const PROVISIONAL_GAMES = 5;
/** Bayes-Prior: so tun, als hätte jede:r schon PRIOR_GAMES Spiele mit 50 % gewonnen. */
export const PRIOR_GAMES = 5;
export const PRIOR_RATE = 0.5;

export type Result = 'W' | 'L';

export interface PlayerStats {
  playerId: string;
  games: number;
  wins: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  diff: number;
  points: number;
  elo: number;
  /** Bayes-geglättete Siegquote 0..1 */
  bayes: number;
  provisional: boolean;
  /** Alle Ergebnisse chronologisch (ältestes zuerst) */
  results: Result[];
  /** Letzte 5 Ergebnisse, ältestes zuerst */
  form: Result[];
  currentStreak: { type: Result | null; length: number };
  longestWinStreak: number;
  lastPlayed: string | null;
}

export interface GameRating {
  gameId: string;
  /** Team-Elo vor dem Spiel (Durchschnitt) */
  redElo: number;
  blueElo: number;
  /** Gewinnwahrscheinlichkeit Rot vor dem Spiel */
  redExpected: number;
  /** Elo-Änderung pro Spieler-ID */
  deltas: Record<string, number>;
}

export interface EloPoint {
  t: string;
  elo: number;
}

export interface LeagueStats {
  players: Map<string, PlayerStats>;
  gameRatings: Map<string, GameRating>;
  eloHistory: Map<string, EloPoint[]>;
}

export function teamOf(game: Game, side: Side): string[] {
  return side === 'red'
    ? [game.red_1, game.red_2].filter((x): x is string => !!x)
    : [game.blue_1, game.blue_2].filter((x): x is string => !!x);
}

export function winnerOf(game: Game): Side {
  return game.score_red > game.score_blue ? 'red' : 'blue';
}

export function sideOf(game: Game, playerId: string): Side | null {
  if (teamOf(game, 'red').includes(playerId)) return 'red';
  if (teamOf(game, 'blue').includes(playerId)) return 'blue';
  return null;
}

export function bayesRate(wins: number, games: number): number {
  return (wins + PRIOR_GAMES * PRIOR_RATE) / (games + PRIOR_GAMES);
}

export function expectedScore(own: number, opp: number): number {
  return 1 / (1 + Math.pow(10, (opp - own) / 400));
}

/** 10:9 → ~1.23, 10:5 → ~1.6, 10:0 → ~1.8 */
export function marginFactor(goalDiff: number): number {
  return 1 + Math.log(1 + Math.abs(goalDiff)) / 3;
}

export function sortGamesChrono(games: Game[]): Game[] {
  return [...games].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

function emptyStats(playerId: string): PlayerStats {
  return {
    playerId,
    games: 0,
    wins: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    diff: 0,
    points: 0,
    elo: ELO_START,
    bayes: PRIOR_RATE,
    provisional: true,
    results: [],
    form: [],
    currentStreak: { type: null, length: 0 },
    longestWinStreak: 0,
    lastPlayed: null,
  };
}

export function computeLeague(players: Player[], games: Game[]): LeagueStats {
  const stats = new Map<string, PlayerStats>();
  const eloHistory = new Map<string, EloPoint[]>();
  const gameRatings = new Map<string, GameRating>();

  const get = (id: string) => {
    let s = stats.get(id);
    if (!s) {
      s = emptyStats(id);
      stats.set(id, s);
      eloHistory.set(id, []);
    }
    return s;
  };
  for (const p of players) {
    get(p.id);
    eloHistory.get(p.id)!.push({ t: p.created_at, elo: ELO_START });
  }

  for (const g of sortGamesChrono(games)) {
    const red = teamOf(g, 'red').map(get);
    const blue = teamOf(g, 'blue').map(get);
    const avg = (team: PlayerStats[]) => team.reduce((s, p) => s + p.elo, 0) / team.length;
    const redElo = avg(red);
    const blueElo = avg(blue);
    const redExpected = expectedScore(redElo, blueElo);
    const winner = winnerOf(g);
    const mov = marginFactor(g.score_red - g.score_blue);
    const deltas: Record<string, number> = {};

    const apply = (team: PlayerStats[], side: Side) => {
      const won = winner === side;
      const expected = side === 'red' ? redExpected : 1 - redExpected;
      const gf = side === 'red' ? g.score_red : g.score_blue;
      const ga = side === 'red' ? g.score_blue : g.score_red;
      for (const p of team) {
        const k = p.games < ROOKIE_K_GAMES ? ELO_K_ROOKIE : ELO_K_PRO;
        const delta = k * mov * ((won ? 1 : 0) - expected);
        deltas[p.playerId] = delta;
        p.games++;
        p.goalsFor += gf;
        p.goalsAgainst += ga;
        const r: Result = won ? 'W' : 'L';
        p.results.push(r);
        if (won) p.wins++;
        else p.losses++;
        if (p.currentStreak.type === r) p.currentStreak.length++;
        else p.currentStreak = { type: r, length: 1 };
        if (r === 'W') p.longestWinStreak = Math.max(p.longestWinStreak, p.currentStreak.length);
        p.lastPlayed = g.created_at;
      }
    };
    apply(red, 'red');
    apply(blue, 'blue');
    // Elo erst nach beiden Teams anwenden (gleiche Ausgangslage für alle)
    for (const p of [...red, ...blue]) {
      p.elo += deltas[p.playerId];
      eloHistory.get(p.playerId)!.push({ t: g.created_at, elo: p.elo });
    }
    gameRatings.set(g.id, { gameId: g.id, redElo, blueElo, redExpected, deltas });
  }

  for (const s of stats.values()) {
    s.diff = s.goalsFor - s.goalsAgainst;
    s.points = s.wins;
    s.bayes = bayesRate(s.wins, s.games);
    s.provisional = s.games < PROVISIONAL_GAMES;
    s.form = s.results.slice(-5);
  }

  return { players: stats, gameRatings, eloHistory };
}

/** Fußball-Tabelle: Punkte → Tordifferenz → geschossene Tore → weniger Spiele */
export function sortTable(list: PlayerStats[]): PlayerStats[] {
  return [...list].sort(
    (a, b) =>
      b.points - a.points ||
      b.diff - a.diff ||
      b.goalsFor - a.goalsFor ||
      a.games - b.games ||
      a.playerId.localeCompare(b.playerId),
  );
}

/** Score-Ranking: Etablierte vor Rookies, dann nach Elo, dann Bayes */
export function sortRanking(list: PlayerStats[]): PlayerStats[] {
  return [...list].sort(
    (a, b) =>
      Number(a.provisional) - Number(b.provisional) ||
      b.elo - a.elo ||
      b.bayes - a.bayes ||
      a.playerId.localeCompare(b.playerId),
  );
}
