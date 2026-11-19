import { describe, expect, it } from 'vitest';
import type { Game, Lab, Player } from './types';
import { LK_START, bayesRate, computeLeague, formatLk, hurdleH, pointsP, sortRanking, sortTable } from './rating';
import {
  bestDuo,
  biggestRivalry,
  duoStats,
  labStats,
  playerRelations,
  records,
} from './insights';

// 2026-01-01 ist ein Donnerstag: Jan 1–4 liegen in derselben Woche (Mo 29.12.–So 04.01.), Jan 5 beginnt die nächste.
const SAME_WEEK = new Date('2026-01-04T23:00:00Z');

const P = (id: string, lab: string | null = null): Player => ({
  id,
  name: id.toUpperCase(),
  lab_id: lab,
  avatar_style: 'adventurer',
  avatar_seed: id,
  created_at: '2026-01-01T00:00:00Z',
  archived_at: null,
});

let n = 0;
const G = (red: string[], blue: string[], sr: number, sb: number, day = 1): Game => ({
  id: `g${String(++n).padStart(4, '0')}`,
  created_at: `2026-01-${String(day).padStart(2, '0')}T12:${String(n % 60).padStart(2, '0')}:00Z`,
  mode: red.length === 2 ? '2v2' : '1v1',
  red_1: red[0],
  red_2: red[1] ?? null,
  blue_1: blue[0],
  blue_2: blue[1] ?? null,
  score_red: sr,
  score_blue: sb,
  deleted_at: null,
});

describe('Punktefunktion P (DTB Anhang A.1)', () => {
  it('Eckwerte', () => {
    expect(pointsP(-5)).toBe(10);
    expect(pointsP(-4)).toBeCloseTo(10);
    expect(pointsP(0)).toBe(50);
    expect(pointsP(4)).toBeCloseTo(110);
    expect(pointsP(7)).toBe(110);
  });
  it('steigt stetig: ein Sieg gegen Stärkere bringt mehr', () => {
    let prev = pointsP(-4);
    for (let d = -3.5; d <= 4; d += 0.5) {
      expect(pointsP(d)).toBeGreaterThan(prev);
      prev = pointsP(d);
    }
  });
});

describe('Hürde H (Anhang A.2)', () => {
  it('Werte', () => {
    expect(hurdleH(24)).toBe(60);
    expect(hurdleH(20)).toBe(100);
    expect(hurdleH(10)).toBe(200);
  });
  it('ist bei LK 10 stetig', () => {
    expect(hurdleH(9.999)).toBeCloseTo(hurdleH(10), 0);
  });
  it('bessere Spieler brauchen mehr Punkte pro Stufe', () => {
    expect(hurdleH(12)).toBeGreaterThan(hurdleH(20));
  });
});

describe('Anzeige', () => {
  it('schneidet auf eine Nachkommastelle ab (kein Runden)', () => {
    expect(formatLk(14.99)).toBe('14.9');
    expect(formatLk(24)).toBe('24.0');
  });
});

describe('LK-Berechnung', () => {
  const players = ['a', 'b', 'c', 'd'].map((x) => P(x));

  it('Einzel: nur der Sieger verbessert sich um P/H, der Verlierer bleibt unberührt', () => {
    const league = computeLeague(players, [G(['a'], ['b'], 10, 9)], SAME_WEEK);
    expect(league.players.get('a')!.lk).toBeCloseTo(LK_START - 50 / 60); // d=0 → P=50, H(24)=60
    expect(league.players.get('b')!.lk).toBe(LK_START);
  });

  it('Doppel: P/H wird je zur Hälfte auf beide Sieger verteilt', () => {
    const league = computeLeague(players, [G(['a', 'b'], ['c', 'd'], 10, 4)], SAME_WEEK);
    expect(league.players.get('a')!.lk).toBeCloseTo(LK_START - 25 / 60);
    expect(league.players.get('b')!.lk).toBeCloseTo(LK_START - 25 / 60);
    expect(league.players.get('c')!.lk).toBe(LK_START);
    expect(league.players.get('d')!.lk).toBe(LK_START);
  });

  it('Doppel: Team-LK ist der Durchschnitt der Partner, beide Sieger bekommen gleich viel', () => {
    const g1 = G(['a'], ['c'], 10, 0, 5); // Woche 2: a verbessert sich
    const g2 = G(['a', 'b'], ['c', 'd'], 10, 5, 12); // Woche 3: starker + schwacher Partner
    const league = computeLeague(players, [g1, g2], new Date('2026-01-12T20:00:00Z'));
    const r = league.gameRatings.get(g2.id)!;
    expect(r.redLk).toBeCloseTo((23.2 + 24.0) / 2, 5);
    expect(r.blueLk).toBeCloseTo(24.0, 5);
    expect(r.gains['a']).toBeCloseTo(r.gains['b']);
    expect(r.gains['a']).toBeCloseTo((pointsP(r.lkDiff) / hurdleH(r.redLk)) * 0.5);
  });

  it('Wochen-Snapshot: Spiele derselben Woche werden gegen die LK vom Wochenanfang bewertet', () => {
    const g1 = G(['a'], ['b'], 10, 3, 1);
    const g2 = G(['a'], ['b'], 10, 3, 2);
    const league = computeLeague(players, [g1, g2], SAME_WEEK);
    const a1 = league.gameRatings.get(g1.id)!.gains['a'];
    const a2 = league.gameRatings.get(g2.id)!.gains['a'];
    expect(a2).toBeCloseTo(a1); // kein "Live"-Effekt innerhalb der Woche
  });

  it('Motivationsaufschlag: +0,025 pro Woche, höchstens LK 25', () => {
    const idle = [P('x')];
    expect(computeLeague(idle, [], new Date('2026-02-26T12:00:00Z')).players.get('x')!.lk).toBeCloseTo(24.2); // 8 Wochen
    expect(computeLeague(idle, [], new Date('2027-06-01T12:00:00Z')).players.get('x')!.lk).toBe(25);
  });

  it('ein Sieg gegen einen Stärkeren bringt mehr als gegen einen Schwächeren', () => {
    const pl = ['a', 'b', 'c'].map((x) => P(x));
    const setup: Game[] = [];
    for (let i = 0; i < 6; i++) setup.push(G(['a'], ['c'], 10, 2, 5)); // a wird viel besser (Woche 2)
    const upset = G(['b'], ['a'], 10, 8, 12);
    const fav = G(['a'], ['b'], 10, 8, 12);
    const l1 = computeLeague(pl, [...setup, upset], new Date('2026-01-12T20:00:00Z'));
    const l2 = computeLeague(pl, [...setup, fav], new Date('2026-01-12T20:00:00Z'));
    expect(l1.gameRatings.get(upset.id)!.gains['b']).toBeGreaterThan(l2.gameRatings.get(fav.id)!.gains['a']);
  });

  it('Ranking: kleinere LK zuerst; Tabelle: Punkte, dann Tordifferenz', () => {
    const pl = ['a', 'b', 'c'].map((x) => P(x));
    const games = [G(['a'], ['c'], 10, 9), G(['b'], ['c'], 10, 2)];
    const league = computeLeague(pl, games, SAME_WEEK);
    const table = sortTable([...league.players.values()]);
    expect(table.map((s) => s.playerId)).toEqual(['b', 'a', 'c']);
    expect(table[0]).toMatchObject({ points: 1, diff: 8, goalsFor: 10, goalsAgainst: 2 });
    expect(sortRanking([...league.players.values()])[2].playerId).toBe('c');
  });

  it('Bayes-Quote (nur Insights) bleibt geglättet', () => {
    expect(bayesRate(1, 1)).toBeLessThan(bayesRate(8, 10));
  });
});

describe('Insights', () => {
  const labs: Lab[] = [
    { id: 'L1', name: 'Lab Eins', created_at: '' },
    { id: 'L2', name: 'Lab Zwei', created_at: '' },
  ];
  const players = [P('a', 'L1'), P('b', 'L1'), P('c', 'L2'), P('d', 'L2')];
  const games = [
    G(['a', 'b'], ['c', 'd'], 10, 5, 1),
    G(['a', 'b'], ['c', 'd'], 10, 0, 2),
    G(['a', 'b'], ['c', 'd'], 10, 8, 3),
    G(['a', 'c'], ['b', 'd'], 7, 10, 4),
  ];
  const league = computeLeague(players, games, new Date('2026-01-05T00:00:00Z'));

  it('beste Paarung', () => {
    const best = bestDuo(duoStats(games));
    expect(best?.ids).toEqual(['a', 'b']);
    expect(best?.wins).toBe(3);
  });

  it('Lab-Ranking (kleinere Ø-LK = besser)', () => {
    const ls = labStats(labs, players, league);
    expect(ls[0].labId).toBe('L1');
    expect(ls[0].wins).toBe(7);
  });

  it('Rekorde: Zu-Null und Seiten', () => {
    const r = records(games, league);
    expect(r.shutouts).toHaveLength(1);
    expect(r.sides).toEqual({ red: 3, blue: 1 });
    expect(Math.abs(r.biggestWin!.score_red - r.biggestWin!.score_blue)).toBe(10);
  });

  it('Rivalität und Nemesis', () => {
    expect(biggestRivalry(games)?.games).toBeGreaterThanOrEqual(3);
    const rel = playerRelations('c', games);
    expect(rel.nemesis?.playerId).toBe('b'); // c hat 4× gegen b verloren
    expect(rel.bestPartner?.playerId).toBe('d'); // einziger Partner mit ≥ 2 Spielen
  });
});
