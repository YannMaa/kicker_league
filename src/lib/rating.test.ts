import { describe, expect, it } from 'vitest';
import type { Game, Lab, Player } from './types';
import { bayesRate, computeLeague, ELO_START, marginFactor, sortRanking, sortTable } from './rating';
import {
  bestDuo,
  biggestRivalry,
  duoStats,
  labStats,
  playerRelations,
  records,
  trainingRecommendations,
} from './insights';

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

describe('Bayes & Torfaktor', () => {
  it('1 Spiel 1 Sieg ergibt keine 100 %', () => {
    expect(bayesRate(1, 1)).toBeCloseTo(3.5 / 6);
    expect(bayesRate(1, 1)).toBeLessThan(bayesRate(8, 10));
  });
  it('höherer Sieg zählt mehr', () => {
    expect(marginFactor(10)).toBeGreaterThan(marginFactor(1));
  });
});

describe('Elo', () => {
  it('ein einzelner Sieg katapultiert niemanden nach oben', () => {
    const players = ['a', 'b', 'c', 'd'].map((x) => P(x));
    const games: Game[] = [];
    for (let i = 0; i < 10; i++) games.push(G(['a'], ['c'], 10, 6));
    games.push(G(['b'], ['d'], 10, 9));
    const league = computeLeague(players, games);
    const ranking = sortRanking([...league.players.values()]);
    expect(ranking[0].playerId).toBe('a');
    // b ist Rookie und landet hinter den etablierten Spielern
    expect(league.players.get('b')!.provisional).toBe(true);
    expect(league.players.get('b')!.elo - ELO_START).toBeLessThan(30);
  });

  it('Underdog-Sieg bringt mehr als Favoritensieg', () => {
    const players = ['a', 'b', 'c'].map((x) => P(x));
    const games: Game[] = [];
    for (let i = 0; i < 8; i++) games.push(G(['a'], ['c'], 10, 3));
    const upset = G(['b'], ['a'], 10, 8);
    const fav = G(['a'], ['c'], 10, 8);
    const l1 = computeLeague(players, [...games, upset]);
    const l2 = computeLeague(players, [...games, fav]);
    expect(l1.gameRatings.get(upset.id)!.deltas['b']).toBeGreaterThan(l2.gameRatings.get(fav.id)!.deltas['a']);
  });

  it('Elo-Summe bleibt bei gleichem K erhalten (Nullsumme)', () => {
    const players = ['a', 'b', 'c', 'd'].map((x) => P(x));
    const league = computeLeague(players, [G(['a', 'b'], ['c', 'd'], 10, 4)]);
    const sum = [...league.players.values()].reduce((s, p) => s + p.elo, 0);
    expect(sum).toBeCloseTo(4 * ELO_START);
  });
});

describe('Tabelle', () => {
  it('sortiert nach Punkten, dann Tordifferenz', () => {
    const players = ['a', 'b', 'c'].map((x) => P(x));
    const games = [G(['a'], ['c'], 10, 9), G(['b'], ['c'], 10, 2)];
    const table = sortTable([...computeLeague(players, games).players.values()]);
    expect(table.map((s) => s.playerId)).toEqual(['b', 'a', 'c']);
    expect(table[0]).toMatchObject({ points: 1, diff: 8, goalsFor: 10, goalsAgainst: 2 });
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
  const league = computeLeague(players, games);

  it('beste Paarung', () => {
    const best = bestDuo(duoStats(games));
    expect(best?.ids).toEqual(['a', 'b']);
    expect(best?.wins).toBe(3);
  });

  it('Lab-Ranking', () => {
    const ls = labStats(labs, players, league);
    expect(ls[0].labId).toBe('L1');
    expect(ls[0].wins).toBe(7);
  });

  it('Rekorde: Zu-Null und Rot/Blau', () => {
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

  it('Trainingsempfehlungen werden erzeugt', () => {
    const recs = trainingRecommendations(league, new Date('2026-01-05T00:00:00Z'));
    expect(recs.some((r) => r.key.startsWith('keeper'))).toBe(true);
    expect(recs.some((r) => r.key.startsWith('form'))).toBe(true);
  });
});
