import { Link } from 'react-router-dom';
import { useLeague } from '../lib/store';
import { bestDuo, biggestRivalry, duoStats, labStats, records, trainingRecommendations, worstDuo } from '../lib/insights';
import { Avatar } from '../components/Avatar';
import { GameRow } from '../components/GameRow';
import { Section } from '../components/Section';

export function Insights() {
  const { games, players, labs, league, playersById } = useLeague();
  const duos = duoStats(games);
  const best = bestDuo(duos);
  const worst = worstDuo(duos);
  const rival = biggestRivalry(games);
  const labList = labStats(labs, players, league);
  const rec = records(games, league);
  const recs = trainingRecommendations(league);
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
    <Link to={`/spieler/${id}`} className="flex items-center gap-3">
      <Avatar player={P(id)} size={44} />
      <div><div className="font-extrabold">{pn(id)}</div><div className="text-sm text-white/70">{extra}</div></div>
    </Link>
  );

  if (!games.length) return <p className="pitch-card text-center">Sobald die ersten Spiele eingetragen sind, gibt es hier Insights. 💡</p>;

  return (
    <div>
      <h1 className="mb-3 font-score text-4xl tracking-wider drop-shadow">Insights</h1>

      <Section title="Trainingsplan">
        <div className="space-y-2">
          {recs.map((r) => (
            <Link key={r.key} to={`/spieler/${r.playerId}`} className={`flex items-start gap-3 rounded-2xl border-2 p-3 ${r.tone === 'good' ? 'border-lime-300/70 bg-lime-300/10' : 'border-white/50 bg-black/20'}`}>
              <span className="text-3xl">{r.emoji}</span>
              <Avatar player={P(r.playerId)} size={40} />
              <div className="min-w-0">
                <div className="font-extrabold">{pn(r.playerId)} <span className="font-semibold text-white/70">· {r.title}</span></div>
                <div className="text-sm">{r.text}</div>
              </div>
            </Link>
          ))}
          {!recs.length && <p className="text-white/70">Alle top in Form. Noch keine Empfehlungen.</p>}
        </div>
      </Section>

      <Section title="Paarungen">
        <div className="grid gap-3">
          <Card emoji="💪" title="Beste Paarung (min. 3 Spiele)">
            {best ? <Duo ids={best.ids} extra={`${best.wins} Siege aus ${best.games} · Quote ${Math.round(best.bayes * 100)}%`} /> : <p className="text-white/70">Noch zu wenig 2vs2-Spiele.</p>}
          </Card>
          <Card emoji="🤡" title="Chaos-Duo">
            {worst ? <Duo ids={worst.ids} extra={`${worst.wins} Siege aus ${worst.games} · Quote ${Math.round(worst.bayes * 100)}%`} /> : <p className="text-white/70">Noch zu wenig Daten.</p>}
          </Card>
          <Card emoji="⚔️" title="Größte Rivalität">
            {rival ? <Duo ids={[rival.a, rival.b]} extra={`${rival.games} Duelle · ${rival.aWins}:${rival.bWins}`} /> : <p className="text-white/70">Noch keine Rivalität.</p>}
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
                <div className="text-sm text-white/70">Ø Elo {Math.round(l.avgElo)} · {l.wins} Siege · {l.activePlayers} Spieler</div>
                {l.bestPlayerId && <div className="text-sm">Bester: <b>{pn(l.bestPlayerId)}</b></div>}
              </div>
              {l.bestPlayerId && <Avatar player={P(l.bestPlayerId)} size={40} />}
            </div>
          ))}
          {!labList.length && <p className="text-white/70">Noch keine Lab-Daten.</p>}
        </div>
      </Section>

      <Section title="Rekorde">
        <div className="grid gap-3">
          {rec.mostWins && <Card emoji="🏆" title="Meiste Siege"><One id={rec.mostWins.playerId} extra={`${rec.mostWins.wins} Siege`} /></Card>}
          {rec.mostGames && <Card emoji="🔁" title="Dauerkicker"><One id={rec.mostGames.playerId} extra={`${rec.mostGames.games} Spiele`} /></Card>}
          {rec.longestStreak && <Card emoji="🔥" title="Längste Siegesserie"><One id={rec.longestStreak.playerId} extra={`${rec.longestStreak.longestWinStreak} Siege in Folge`} /></Card>}
          {rec.underdog && <Card emoji="🐶" title="Größter Underdog-Sieg"><GameRow game={rec.underdog.game} /><div className="mt-1 text-xs text-white/70">Elo-Rückstand: {Math.round(rec.underdog.eloGap)}</div></Card>}
          {rec.biggestWin && <Card emoji="💥" title="Höchster Sieg"><GameRow game={rec.biggestWin} /></Card>}
          <Card emoji="🔴🔵" title="Rot vs. Blau">
            <div className="scoreboard rounded-md px-3 text-center text-4xl">{rec.sides.red} : {rec.sides.blue}</div>
            <div className="mt-1 text-center text-sm text-white/70">{rec.totalGames} Spiele · {rec.totalGoals} Tore</div>
          </Card>
          <Card emoji="🫣" title="Hall of Shame: Zu Null">
            <div className="space-y-2">
              {rec.shutouts.slice(0, 5).map((g) => <GameRow key={g.id} game={g} />)}
              {!rec.shutouts.length && <p className="text-white/70">Noch kein Zu-Null-Spiel. Noch!</p>}
            </div>
          </Card>
        </div>
      </Section>
    </div>
  );
}
