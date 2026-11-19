/**
 * Rating-Logik der AIBE Kicker-Liga.
 *
 * Die LK (Leistungsklasse) folgt dem Verfahren des Deutschen Tennis Bundes
 * (Durchführungsbestimmungen zur LKO, Stand 01.01.2024). Paragrafen-Verweise unten beziehen sich darauf.
 * Alles hier sind reine Funktionen über die Rohdaten (players + games):
 * Alle Werte lassen sich jederzeit aus dem Backup neu berechnen.
 *
 * NICHT übernommen (für das Büro irrelevant): Altersklassenfaktor A (=100 %), Zählweisenfaktor Z (=100 %),
 * Bonus für Mannschaftsspiele/Meisterschaften, Nichtantreten, Ranglisten-Einstufung, 50-%-Erlass des
 * Motivationsaufschlags nach 12 Monaten Pause (§ 10.6).
 */
import type { Game, Player, Side } from './types';

/** § 10.1: Ersteinstufung normalerweise LK 24,0 */
export const LK_START = 24;
/** § 6.2: rechnerisch bessere Werte als 1,5 werden auf 1,5 gesetzt */
export const LK_BEST = 1.5;
/** § 6.2 / § 5: schlechtester Wert 25,0 */
export const LK_WORST = 25;
/** § 5: jede Woche +0,025 auf die LK (also eine kleine Verschlechterung), bis 25 */
export const LK_WEEKLY_SURCHARGE = 0.025;
/** § 4: im Doppel wird P/H zu je 50 % auf die beiden Sieger verteilt */
export const DOUBLES_SHARE = 0.5;
/** Unter so vielen Spielen gilt man als "Rookie" (nur Anzeige/Insights, hat keinen Einfluss auf die LK). */
export const PROVISIONAL_GAMES = 5;
/** Bayes-Prior (nur für Insights wie "beste Paarung"): so tun, als gäbe es schon 5 Spiele mit 50 %. */
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
  /** LK-Begleitwert (volle Genauigkeit). Anzeige mit formatLk(). Kleiner = besser. */
  lk: number;
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
  /** Team-LK (Durchschnitt der Wochen-LK der Partner, § 4) */
  redLk: number;
  blueLk: number;
  /** d = LK Sieger − LK Verlierer (positiv = der Schwächere hat gewonnen) */
  lkDiff: number;
  /** Punktzahl P (Anhang A.1) und Hürde H (Anhang A.2) */
  points: number;
  hurdle: number;
  /** LK-Verbesserung je Sieger (nur Sieger bewegen sich, § 3). Verlierer fehlen hier. */
  gains: Record<string, number>;
}

export interface LkPoint {
  t: string;
  lk: number;
}

export interface LeagueStats {
  players: Map<string, PlayerStats>;
  gameRatings: Map<string, GameRating>;
  lkHistory: Map<string, LkPoint[]>;
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

/** Anhang A.1: Punktzahl P aus d = LK(Sieger) − LK(Verlierer) */
export function pointsP(d: number): number {
  if (d <= -4) return 10;
  if (d <= 0) return -1.25 * d ** 3 - 7.5 * d ** 2 + 50;
  if (d < 4) return -1.875 * d ** 3 + 11.25 * d ** 2 + 50;
  return 110;
}

/** Anhang A.2: Hürde H aus der eigenen LK (Punktzahl, die für eine ganze LK-Stufe nötig ist) */
export function hurdleH(lk: number): number {
  const base = 10 * (30 - lk);
  if (lk >= 10) return base;
  return base + (6435 / 289) * ((20 * (5 - lk)) / (lk * lk) + 1);
}

/** Anzeige: eine Nachkommastelle, abgeschnitten, nicht gerundet (§ 3) */
export function truncLk(lk: number): number {
  return Math.floor(lk * 10 + 1e-9) / 10;
}
export const formatLk = (lk: number): string => truncLk(lk).toFixed(1);

export function sortGamesChrono(games: Game[]): Game[] {
  return [...games].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/** Wochennummer (Woche beginnt Montag, UTC). 1970-01-05 war ein Montag. */
function weekOf(t: string | number): number {
  return Math.floor((new Date(t).getTime() / 86_400_000 - 4) / 7);
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
    lk: LK_START,
    provisional: true,
    results: [],
    form: [],
    currentStreak: { type: null, length: 0 },
    longestWinStreak: 0,
    lastPlayed: null,
  };
}

interface Meta {
  /** LK vom Wochenanfang, auf eine Stelle abgeschnitten: Basis für P und H (§ 6.1) */
  fixed: number;
  joinWeek: number;
}

/**
 * Berechnet Tabelle und LK für alle Spieler.
 * - Ergebnisse einer Woche werden gegen die LK vom Wochenanfang bewertet (§ 6.1).
 * - Nur Sieger verbessern sich um P/H (Doppel: je 50 %), Verlierer bleiben unverändert (§ 3, § 4).
 * - Zum Wochenwechsel kommen 0,025 auf jede LK (§ 5), begrenzt auf 1,5 … 25,0 (§ 6.2).
 * Abweichung vom Tennis: Die LK wird sofort nach dem Spiel angezeigt (nicht erst nach der Auswertung am Mittwoch).
 */
export function computeLeague(players: Player[], games: Game[], now: Date = new Date()): LeagueStats {
  const stats = new Map<string, PlayerStats>();
  const meta = new Map<string, Meta>();
  const lkHistory = new Map<string, LkPoint[]>();
  const gameRatings = new Map<string, GameRating>();
  const sorted = sortGamesChrono(games);

  const ensure = (id: string, joinWeek: number): PlayerStats => {
    let s = stats.get(id);
    if (!s) {
      s = emptyStats(id);
      stats.set(id, s);
      meta.set(id, { fixed: truncLk(LK_START), joinWeek });
      lkHistory.set(id, []);
    }
    return s;
  };
  for (const p of players) {
    ensure(p.id, weekOf(p.created_at));
    lkHistory.get(p.id)!.push({ t: p.created_at, lk: LK_START });
  }

  let cur = Math.min(
    ...[...meta.values()].map((m) => m.joinWeek),
    sorted.length ? weekOf(sorted[0].created_at) : Infinity,
  );

  /** Wochenwechsel: Motivationsaufschlag für jede abgeschlossene Woche, dann LK für die neue Woche fixieren. */
  const rollover = (to: number) => {
    if (to <= cur) return;
    for (const [id, m] of meta) {
      const s = stats.get(id)!;
      const weeks = Math.max(0, to - Math.max(cur, m.joinWeek));
      if (s.lk < LK_WORST) s.lk = Math.min(LK_WORST, s.lk + weeks * LK_WEEKLY_SURCHARGE);
      s.lk = Math.max(LK_BEST, s.lk);
      m.fixed = truncLk(s.lk);
    }
    cur = to;
  };

  for (const g of sorted) {
    const w = weekOf(g.created_at);
    rollover(w);
    const joinWeek = w;
    const red = teamOf(g, 'red').map((id) => ensure(id, joinWeek));
    const blue = teamOf(g, 'blue').map((id) => ensure(id, joinWeek));
    const side = winnerOf(g);
    const win = side === 'red' ? red : blue;
    const lose = side === 'red' ? blue : red;
    const teamLk = (team: PlayerStats[]) => team.reduce((s, p) => s + meta.get(p.playerId)!.fixed, 0) / team.length;

    const winLk = teamLk(win);
    const loseLk = teamLk(lose);
    const lkDiff = winLk - loseLk;
    const points = pointsP(lkDiff);
    const hurdle = hurdleH(winLk);
    const share = win.length === 2 ? DOUBLES_SHARE : 1;
    const improvement = (points / hurdle) * share; // A = 1, Z = 1
    const gains: Record<string, number> = {};

    for (const [team, won] of [
      [win, true],
      [lose, false],
    ] as const) {
      const isRed = team === red;
      const gf = isRed ? g.score_red : g.score_blue;
      const ga = isRed ? g.score_blue : g.score_red;
      for (const p of team) {
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
        if (won) {
          const before = p.lk;
          p.lk = Math.max(LK_BEST, p.lk - improvement);
          gains[p.playerId] = before - p.lk;
        }
        lkHistory.get(p.playerId)!.push({ t: g.created_at, lk: p.lk });
      }
    }
    gameRatings.set(g.id, {
      gameId: g.id,
      redLk: side === 'red' ? winLk : loseLk,
      blueLk: side === 'red' ? loseLk : winLk,
      lkDiff,
      points,
      hurdle,
      gains,
    });
  }

  rollover(weekOf(now.getTime()));

  for (const s of stats.values()) {
    s.diff = s.goalsFor - s.goalsAgainst;
    s.points = s.wins;
    s.provisional = s.games < PROVISIONAL_GAMES;
    s.form = s.results.slice(-5);
  }
  return { players: stats, gameRatings, lkHistory };
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

/** LK-Ranking: kleinere LK = besser, bei Gleichstand mehr Siege */
export function sortRanking(list: PlayerStats[]): PlayerStats[] {
  return [...list].sort(
    (a, b) => a.lk - b.lk || b.wins - a.wins || a.games - b.games || a.playerId.localeCompare(b.playerId),
  );
}
