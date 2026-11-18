import type { Game, Lab, Player } from './types';
import type { LeagueData } from './api';

/** Beispieldaten für den Demo-Modus (ohne Supabase). Deterministisch. */
export function demoData(): LeagueData {
  let s = 42;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const day = 24 * 3600_000;
  const start = Date.now() - 24 * day;
  const iso = (t: number) => new Date(t).toISOString();

  const labs: Lab[] = ['Lab Robotik', 'Lab Machine Learning', 'Lab Data Science', 'Lab Embedded'].map((name, i) => ({
    id: `demo-lab-${i}`,
    name,
    created_at: iso(start),
  }));
  const names: [string, number, string][] = [
    ['Anna', 0, 'adventurer'],
    ['Ben', 1, 'bottts'],
    ['Chiara', 2, 'funEmoji'],
    ['David', 0, 'avataaars'],
    ['Elif', 1, 'lorelei'],
    ['Felix', 3, 'pixelArt'],
    ['Greta', 2, 'bigSmile'],
    ['Hannes', 3, 'thumbs'],
    ['Ines', 1, 'adventurer'],
  ];
  const strength = [1.4, 1.1, 1.0, 0.8, 1.2, 0.7, 0.95, 0.6, 1.0];
  const players: Player[] = names.map(([name, lab, style], i) => ({
    id: `demo-p-${i}`,
    name,
    lab_id: labs[lab].id,
    avatar_style: style,
    avatar_seed: name.toLowerCase(),
    created_at: iso(start),
  }));
  const totalGames = 45;
  const games: Game[] = [];
  for (let i = 0; i < totalGames; i++) {
    const n = i === 44 ? 7 : players.length - 1; // Ines kommt spät dazu
    const pool = players.slice(0, n).map((_, k) => k);
    pool.sort(() => rnd() - 0.5);
    const two = rnd() < 0.75;
    const red = two ? pool.slice(0, 2) : pool.slice(0, 1);
    const blue = two ? pool.slice(2, 4) : pool.slice(1, 2);
    const sr = red.reduce((a, k) => a + strength[k], 0);
    const sb = blue.reduce((a, k) => a + strength[k], 0);
    const redWins = rnd() < sr / (sr + sb);
    const loser = Math.floor(rnd() * rnd() * 10);
    games.push({
      id: `demo-g-${i}`,
      created_at: iso(start + (i / totalGames) * 23 * day + rnd() * 3600_000),
      mode: two ? '2v2' : '1v1',
      red_1: players[red[0]].id,
      red_2: two ? players[red[1]].id : null,
      blue_1: players[blue[0]].id,
      blue_2: two ? players[blue[1]].id : null,
      score_red: redWins ? 10 : loser,
      score_blue: redWins ? loser : 10,
    });
  }
  return { labs, players, games };
}
