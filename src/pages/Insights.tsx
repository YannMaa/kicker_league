import { Link } from 'react-router-dom';
import { formatLk } from '../lib/rating';
import { useLeague } from '../lib/store';
import { bestDuo, biggestRivalry, duoStats, labStats, records, worstDuo } from '../lib/insights';
import { Avatar } from '../components/Avatar';
import { GameRow } from '../components/GameRow';
import { Section } from '../components/Section';

export function Insights() {
  const { games, players, labs, league, playersById } = useLeague();
  const isActive = (id: string) => league.players.has(id);
  // Duos/Rivalitäten mit entfernten Spielern ausblenden
  const duos = duoStats(games).filter((d) => d.ids.every(isActive));
  const best = bestDuo(duos);
  const worst = worstDuo(duos);
  const rival = biggestRivalry(games, (a, b) => isActive(a) && isActive(b));
  const labList = labStats(labs, players, league);
  const rec = records(games, league);
  const P = (id: string) => playersById.get(id);
  const pn = (id: string) => P(id)?.name ?? '?';

  const Card = ({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) => (
    <div className="pitch-card">
      <div className="mb-1 text-xs font-bold uppercase tracking-widest text-white/70">{emoji} {title}</div>
      {children}
    </div>
  );
  const Duo = ({ ids, extra }: { ids: [string, string]; extra: string }) => (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-3"><Avatar player={P(ids[0])} size={44} /><Avatar player={P(ids[1])} size={44} /></div>
      <div><div className="font-extrabold">{pn(ids[0])} & {pn(ids[1])}</div><div className="text-sm text-white/70">{extra}</div></div>
    </div>
  );
  const One = ({ id, extra }: { id: string; extra: string }) => (
    <Link to={`/players/${id}`} className="flex items-center gap-3">
      <Avatar player={P(id)} size={44} />
      <div><div className="font-extrabold">{pn(id)}</div><div className="text-sm text-white/70">{extra}</div></div>
    </Link>
  );

  if (!games.length) return <p className="pitch-card text-center">Once the first matches are logged, insights will show up here. 💡</p>;

  return (
    <div>
      <h1 className="mb-3 font-score text-4xl tracking-wider drop-shadow">Insights</h1>

      <Section title="Pairings">
        <div className="grid gap-3">
          <Card emoji="💪" title="Best duo (min. 3 matches)">
            {best ? <Duo ids={best.ids} extra={`${best.wins} wins from ${best.games} · win rate ${Math.round(best.bayes * 100)}%`} /> : <p className="text-white/70">Not enough 2v2 matches yet.</p>}
          </Card>
          <Card emoji="🤡" title="Chaos duo">
            {worst ? <Duo ids={worst.ids} extra={`${worst.wins} wins from ${worst.games} · win rate ${Math.round(worst.bayes * 100)}%`} /> : <p className="text-white/70">Not enough data yet.</p>}
          </Card>
          <Card emoji="⚔️" title="Biggest rivalry">
            {rival ? <Duo ids={[rival.a, rival.b]} extra={`${rival.games} duels · ${rival.aWins}:${rival.bWins}`} /> : <p className="text-white/70">No rivalry yet.</p>}
          </Card>
        </div>
      </Section>

      <Section title="Labs">
        <div className="space-y-2">
          {labList.map((l, i) => (
            <div key={l.labId} className="pitch-card flex items-center gap-3">
              <span className="font-score text-4xl">{i === 0 ? '👑' : i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-extrabold">{l.name}</div>
                <div className="text-sm text-white/70">Avg LK {formatLk(l.avgLk)} · {l.wins} wins · {l.activePlayers} active players</div>
                {l.bestPlayerId && <div className="text-sm">Best: <b>{pn(l.bestPlayerId)}</b></div>}
              </div>
              {l.bestPlayerId && <Avatar player={P(l.bestPlayerId)} size={40} />}
            </div>
          ))}
          {!labList.length && <p className="text-white/70">No lab data yet.</p>}
        </div>
      </Section>

      <Section title="Records">
        <div className="grid gap-3">
          {rec.mostWins && <Card emoji="🏆" title="Most wins"><One id={rec.mostWins.playerId} extra={`${rec.mostWins.wins} wins`} /></Card>}
          {rec.mostGames && <Card emoji="🔁" title="Table regular"><One id={rec.mostGames.playerId} extra={`${rec.mostGames.games} matches`} /></Card>}
          {rec.longestStreak && <Card emoji="🔥" title="Longest win streak"><One id={rec.longestStreak.playerId} extra={`${rec.longestStreak.longestWinStreak} wins in a row`} /></Card>}
          {rec.underdog && <Card emoji="🐶" title="Biggest underdog win"><GameRow game={rec.underdog.game} /><div className="mt-1 text-xs text-white/70">LK gap: {rec.underdog.lkGap.toFixed(1)}</div></Card>}
          {rec.biggestWin && <Card emoji="💥" title="Biggest win"><GameRow game={rec.biggestWin} /></Card>}
          <Card emoji="⚫⚪" title="Black vs. White">
            <div className="scoreboard rounded-md px-3 text-center text-4xl">{rec.sides.red} : {rec.sides.blue}</div>
            <div className="mt-1 text-center text-sm text-white/70">{rec.totalGames} matches · {rec.totalGoals} goals</div>
          </Card>
          <Card emoji="🫣" title="Hall of Shame: shutouts">
            <div className="space-y-2">
              {rec.shutouts.slice(0, 5).map((g) => <GameRow key={g.id} game={g} />)}
              {!rec.shutouts.length && <p className="text-white/70">No shutout yet. Yet!</p>}
            </div>
          </Card>
        </div>
      </Section>
    </div>
  );
}
