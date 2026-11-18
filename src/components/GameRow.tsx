import { Link } from 'react-router-dom';
import { useLeague } from '../lib/store';
import { teamOf, winnerOf } from '../lib/rating';
import type { Game } from '../lib/types';
import { Avatar } from './Avatar';

export function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  return sameDay ? `heute ${time}` : `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} ${time}`;
}

export function GameRow({ game, highlight }: { game: Game; highlight?: string }) {
  const { playersById, league } = useLeague();
  const w = winnerOf(game);
  const rating = league.gameRatings.get(game.id);
  const team = (side: 'red' | 'blue') => (
    <div className={`flex min-w-0 flex-1 items-center gap-1 ${side === 'blue' ? 'flex-row-reverse text-right' : ''}`}>
      <div className={`flex ${side === 'blue' ? 'flex-row-reverse' : ''} -space-x-2`}>
        {teamOf(game, side).map((id) => (
          <Link key={id} to={`/spieler/${id}`}>
            <Avatar player={playersById.get(id)} size={30} ring={side} />
          </Link>
        ))}
      </div>
      <div className={`min-w-0 truncate text-xs ${w === side ? 'font-extrabold' : 'text-white/70'}`}>
        {teamOf(game, side)
          .map((id) => playersById.get(id)?.name ?? '?')
          .join(' & ')}
      </div>
    </div>
  );
  const delta = highlight && rating ? rating.deltas[highlight] : undefined;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-black/20 px-2 py-2">
      {team('red')}
      <div className="flex flex-col items-center">
        <div className="scoreboard rounded-md px-2 text-2xl leading-tight">
          <span className={w === 'red' ? '' : 'opacity-60'}>{game.score_red}</span>:
          <span className={w === 'blue' ? '' : 'opacity-60'}>{game.score_blue}</span>
        </div>
        <span className="text-[10px] text-white/60">{formatDate(game.created_at)}</span>
        {delta !== undefined && (
          <span className={`text-[10px] font-bold ${delta >= 0 ? 'text-lime-300' : 'text-red-300'}`}>
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(1)} Elo
          </span>
        )}
      </div>
      {team('blue')}
    </div>
  );
}
