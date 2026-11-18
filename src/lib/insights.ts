/**
 * Insights & Trainingsempfehlungen – reine Funktionen über Rohdaten + LeagueStats.
 */
import type { Game, Lab, Player } from './types';
import {
  type LeagueStats,
  type PlayerStats,
  PROVISIONAL_GAMES,
  bayesRate,
  sideOf,
  sortGamesChrono,
  teamOf,
  winnerOf,
} from './rating';

const DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------- Duos
export interface DuoStat {
  ids: [string, string];
  games: number;
  wins: number;
  goalsFor: number;
  goalsAgainst: number;
  bayes: number;
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function duoStats(games: Game[]): DuoStat[] {
  const map = new Map<string, DuoStat>();
  for (const g of games) {
    if (g.mode !== '2v2') continue;
    const winner = winnerOf(g);
    for (const side of ['red', 'blue'] as const) {
      const [a, b] = teamOf(g, side);
      const key = pairKey(a, b);
      let d = map.get(key);
      if (!d) {
        d = { ids: (a < b ? [a, b] : [b, a]) as [string, string], games: 0, wins: 0, goalsFor: 0, goalsAgainst: 0, bayes: 0 };
        map.set(key, d);
      }
      d.games++;
      if (winner === side) d.wins++;
      d.goalsFor += side === 'red' ? g.score_red : g.score_blue;
      d.goalsAgainst += side === 'red' ? g.score_blue : g.score_red;
    }
  }
  const list = [...map.values()];
  for (const d of list) d.bayes = bayesRate(d.wins, d.games);
  return list;
}

export function bestDuo(duos: DuoStat[], minGames = 3): DuoStat | null {
  const c = duos.filter((d) => d.games >= minGames);
  if (!c.length) return null;
  return c.sort((a, b) => b.bayes - a.bayes || b.games - a.games)[0];
}

export function worstDuo(duos: DuoStat[], minGames = 3): DuoStat | null {
  const c = duos.filter((d) => d.games >= minGames);
  if (c.length < 2) return null;
  return c.sort((a, b) => a.bayes - b.bayes || b.games - a.games)[0];
}

// ---------------------------------------------------------------- Head to head
export interface H2H {
  a: string;
  b: string;
  games: number;
  aWins: number;
  bWins: number;
}

export function headToHead(games: Game[]): H2H[] {
  const map = new Map<string, H2H>();
  for (const g of games) {
    const winner = winnerOf(g);
    for (const r of teamOf(g, 'red')) {
      for (const bl of teamOf(g, 'blue')) {
        const [a, b] = r < bl ? [r, bl] : [bl, r];
        const key = `${a}|${b}`;
        let h = map.get(key);
        if (!h) {
          h = { a, b, games: 0, aWins: 0, bWins: 0 };
          map.set(key, h);
        }
        h.games++;
        const winnerId = winner === 'red' ? r : bl;
        if (winnerId === a) h.aWins++;
        else h.bWins++;
      }
    }
  }
  return [...map.values()];
}

export function biggestRivalry(games: Game[], keep?: (a: string, b: string) => boolean): H2H | null {
  const list = headToHead(games).filter((h) => h.games >= 2 && (!keep || keep(h.a, h.b)));
  if (!list.length) return null;
  return list.sort(
    (x, y) => y.games - x.games || Math.abs(x.aWins - x.bWins) - Math.abs(y.aWins - y.bWins),
  )[0];
}

// ---------------------------------------------------------------- Beziehungen eines Spielers
export interface Relation {
  playerId: string;
  games: number;
  wins: number;
  losses: number;
}

export interface PlayerRelations {
  partners: Relation[];
  opponents: Relation[];
  bestPartner: Relation | null;
  nemesis: Relation | null;
  favoriteVictim: Relation | null;
}

export function playerRelations(playerId: string, games: Game[]): PlayerRelations {
  const partners = new Map<string, Relation>();
  const opponents = new Map<string, Relation>();
  const bump = (m: Map<string, Relation>, id: string, won: boolean) => {
    let r = m.get(id);
    if (!r) {
      r = { playerId: id, games: 0, wins: 0, losses: 0 };
      m.set(id, r);
    }
    r.games++;
    if (won) r.wins++;
    else r.losses++;
  };
  for (const g of games) {
    const side = sideOf(g, playerId);
    if (!side) continue;
    const won = winnerOf(g) === side;
    const other = side === 'red' ? 'blue' : 'red';
    for (const id of teamOf(g, side)) if (id !== playerId) bump(partners, id, won);
    for (const id of teamOf(g, other)) bump(opponents, id, won);
  }
  const p = [...partners.values()];
  const o = [...opponents.values()];
  const bestPartner =
    p.filter((r) => r.games >= 2).sort((a, b) => bayesRate(b.wins, b.games) - bayesRate(a.wins, a.games))[0] ?? null;
  const nemesis =
    o.filter((r) => r.losses >= 2 && r.losses > r.wins).sort((a, b) => b.losses - a.losses || a.wins - b.wins)[0] ?? null;
  const favoriteVictim =
    o.filter((r) => r.wins >= 2 && r.wins > r.losses).sort((a, b) => b.wins - a.wins || a.losses - b.losses)[0] ?? null;
  return {
    partners: p.sort((a, b) => b.games - a.games),
    opponents: o.sort((a, b) => b.games - a.games),
    bestPartner,
    nemesis,
    favoriteVictim,
  };
}

// ---------------------------------------------------------------- Labs
export interface LabStat {
  labId: string;
  name: string;
  activePlayers: number;
  games: number;
  wins: number;
  avgElo: number;
  bayes: number;
  bestPlayerId: string | null;
}

export function labStats(labs: Lab[], players: Player[], league: LeagueStats): LabStat[] {
  const out: LabStat[] = [];
  for (const lab of labs) {
    const members = players
      .filter((p) => p.lab_id === lab.id)
      .map((p) => league.players.get(p.id)!)
      .filter((s) => s && s.games > 0);
    if (!members.length) continue;
    const games = members.reduce((s, m) => s + m.games, 0);
    const wins = members.reduce((s, m) => s + m.wins, 0);
    const best = [...members].sort(
      (a, b) => Number(a.provisional) - Number(b.provisional) || b.elo - a.elo,
    )[0];
    out.push({
      labId: lab.id,
      name: lab.name,
      activePlayers: members.length,
      games,
      wins,
      avgElo: members.reduce((s, m) => s + m.elo, 0) / members.length,
      bayes: bayesRate(wins, games),
      bestPlayerId: best?.playerId ?? null,
    });
  }
  return out.sort((a, b) => b.avgElo - a.avgElo || b.wins - a.wins);
}

// ---------------------------------------------------------------- Rekorde
export interface Records {
  totalGames: number;
  totalGoals: number;
  mostWins: PlayerStats | null;
  mostGames: PlayerStats | null;
  longestStreak: PlayerStats | null;
  biggestWin: Game | null;
  shutouts: Game[];
  underdog: { game: Game; eloGap: number } | null;
  sides: { red: number; blue: number };
}

export function records(games: Game[], league: LeagueStats): Records {
  const active = [...league.players.values()].filter((s) => s.games > 0);
  const pick = (f: (s: PlayerStats) => number) =>
    active.length ? [...active].sort((a, b) => f(b) - f(a))[0] : null;

  const chrono = sortGamesChrono(games);
  let biggestWin: Game | null = null;
  let underdog: Records['underdog'] = null;
  const sides = { red: 0, blue: 0 };
  for (const g of chrono) {
    const diff = Math.abs(g.score_red - g.score_blue);
    if (!biggestWin || diff > Math.abs(biggestWin.score_red - biggestWin.score_blue)) biggestWin = g;
    const winner = winnerOf(g);
    sides[winner]++;
    const r = league.gameRatings.get(g.id);
    if (r) {
      const gap = winner === 'red' ? r.blueElo - r.redElo : r.redElo - r.blueElo;
      if (gap > 0 && (!underdog || gap > underdog.eloGap)) underdog = { game: g, eloGap: gap };
    }
  }
  const mostWins = pick((s) => s.wins);
  const longestStreak = pick((s) => s.longestWinStreak);
  return {
    totalGames: games.length,
    totalGoals: games.reduce((s, g) => s + g.score_red + g.score_blue, 0),
    mostWins: mostWins && mostWins.wins > 0 ? mostWins : null,
    mostGames: pick((s) => s.games),
    longestStreak: longestStreak && longestStreak.longestWinStreak > 1 ? longestStreak : null,
    biggestWin,
    shutouts: chrono.filter((g) => g.score_red === 0 || g.score_blue === 0).reverse(),
    underdog,
    sides,
  };
}

// ---------------------------------------------------------------- Trainingsempfehlungen
export interface Recommendation {
  key: string;
  emoji: string;
  title: string;
  playerId: string;
  text: string;
  tone: 'bad' | 'good';
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
/** Deterministisch pro Spieler wählen, damit der Text nicht bei jedem Reload wechselt. */
function pickText(texts: string[], seed: string): string {
  return texts[hash(seed) % texts.length];
}

const TXT = {
  keeper: [
    'The goal is wide open, like the cafeteria at noon. Goalkeeper training strongly recommended!',
    'Goals conceded per game: record high. Maybe try actually holding the back rod?',
    'The back door is wide open. Please lock it before the next match.',
  ],
  striker: [
    'The ball just will not go in. Striker coaching: 100 shots every lunch break.',
    'Scores less often than the printer on the 3rd floor. Drink some aiming water!',
    'Goal threat: low. Pro tip: the ball has to go into the OTHER goal.',
  ],
  camp: [
    'Training camp at the foosball table recommended. Sleeping bag provided.',
    'The Elo needs some love. Maybe play with the top 3 and learn from them?',
    'A place in the sun? More like a place in the basement. Time for extra shifts!',
  ],
  crisis: [
    'Losing streak! Crisis meeting with the board has been called.',
    'The coach\u2019s chair is wobbling. A win is needed, and fast!',
    'Bad luck streak detected. Recommendation: bring a lucky charm and switch sides.',
  ],
  injury: [
    'Long time no see. Injured, or secretly training?',
    'Has not been seen at the table for weeks. We miss you!',
    'Missing person: last seen at the foosball table. Please report to the league office.',
  ],
  bench: [
    'Registered, but barely played. Off the bench and into the game!',
    'Benchwarmer alert: the rods are waiting for you!',
    'Still a rookie. A few more matches and you are officially in the table!',
  ],
  form: [
    'Form curve is pointing steeply upwards. Currently unstoppable!',
    'On fire! Collected the most Elo in the last week.',
    'Run of a lifetime! Please do not disturb, the flow is sacred.',
  ],
};

export function trainingRecommendations(league: LeagueStats, now: Date = new Date()): Recommendation[] {
  const all = [...league.players.values()];
  const active = all.filter((s) => s.games >= 3);
  const recs: Recommendation[] = [];
  const add = (key: string, emoji: string, title: string, s: PlayerStats, pool: string[], tone: 'bad' | 'good' = 'bad') =>
    recs.push({ key: `${key}-${s.playerId}`, emoji, title, playerId: s.playerId, text: pickText(pool, s.playerId + key), tone });

  // 🔥 Formkurve: größter Elo-Gewinn der letzten 7 Tage
  const since = now.getTime() - 7 * DAY;
  let bestForm: { s: PlayerStats; gain: number } | null = null;
  for (const s of all) {
    const hist = league.eloHistory.get(s.playerId) ?? [];
    const before = [...hist].reverse().find((p) => new Date(p.t).getTime() < since)?.elo ?? hist[0]?.elo;
    const recent = hist.filter((p) => new Date(p.t).getTime() >= since);
    if (!recent.length || before === undefined) continue;
    const gain = recent[recent.length - 1].elo - before;
    if (gain > 0 && (!bestForm || gain > bestForm.gain)) bestForm = { s, gain };
  }
  if (bestForm) add('form', '🔥', 'Hot streak', bestForm.s, TXT.form, 'good');

  // 🧤 Torwart-Training
  const keeper = [...active].sort((a, b) => b.goalsAgainst / b.games - a.goalsAgainst / a.games)[0];
  if (keeper) add('keeper', '🧤', 'Goalkeeper training', keeper, TXT.keeper);

  // 🎯 Sturm-Coaching
  const striker = [...active].sort((a, b) => a.goalsFor / a.games - b.goalsFor / b.games)[0];
  if (striker && striker.playerId !== keeper?.playerId) add('striker', '🎯', 'Striker coaching', striker, TXT.striker);

  // 🏕️ Trainingslager: niedrigstes Elo bei ≥ PROVISIONAL_GAMES Spielen
  const established = all.filter((s) => s.games >= PROVISIONAL_GAMES);
  if (established.length >= 3) {
    const camp = [...established].sort((a, b) => a.elo - b.elo)[0];
    add('camp', '🏕️', 'Training camp recommended', camp, TXT.camp);
  }

  // 🚨 Krisensitzung: Niederlagenserie ≥ 3
  for (const s of all)
    if (s.currentStreak.type === 'L' && s.currentStreak.length >= 3)
      add('crisis', '🚨', `Crisis meeting (${s.currentStreak.length} losses in a row)`, s, TXT.crisis);

  // 🛋️ Verletzungspause: > 14 Tage nicht gespielt
  all
    .filter((s) => s.lastPlayed && now.getTime() - new Date(s.lastPlayed).getTime() > 14 * DAY)
    .sort((a, b) => a.lastPlayed!.localeCompare(b.lastPlayed!))
    .slice(0, 3)
    .forEach((s) => add('injury', '🛋️', 'Injured?', s, TXT.injury));

  // 🪑 Bankdrücker: < 3 Spiele
  all
    .filter((s) => s.games < 3)
    .slice(0, 3)
    .forEach((s) => add('bench', '🪑', 'Benchwarmer', s, TXT.bench));

  return recs;
}

// ---------------------------------------------------------------- Quips after a match
export function resultQuip(game: Game, underdogWin: boolean): string {
  const diff = Math.abs(game.score_red - game.score_blue);
  const loserScore = Math.min(game.score_red, game.score_blue);
  const seed = game.id;
  if (loserScore === 0)
    return pickText(
      [
        'SHUTOUT! Under the table with you! 🫣',
        'Maximum penalty! The losers now know what the underside of the table looks like.',
        'A clean sheet win. This goes straight into the Hall of Shame.',
      ],
      seed,
    );
  if (underdogWin)
    return pickText(
      [
        'David beats Goliath! Underdog win, that means bonus Elo. 🐶',
        'Sensation! The bookmakers are speechless.',
        'Nobody saw that coming, not even the winners themselves.',
      ],
      seed,
    );
  if (diff === 1)
    return pickText(
      [
        'It cannot get any closer! A real thriller. 🍿',
        'One goal difference. The rematch is going to be hot!',
        'Pure suspense. Heart rate at 180.',
      ],
      seed,
    );
  if (diff >= 6)
    return pickText(
      [
        'Clear-cut! That was a masterclass. 📚',
        'A decisive win. The losers should check out the training plan.',
        'Pure dominance! The rods are still glowing.',
      ],
      seed,
    );
  return pickText(
    ['Great match! Into the table it goes. ⚽', 'Well deserved win! Next round?', 'Nicely played! The table is shaking.'],
    seed,
  );
}
