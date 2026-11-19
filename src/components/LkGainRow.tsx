import { Link } from 'react-router-dom';
import { useLeague } from '../lib/store';
import { formatLk } from '../lib/rating';
import type { Game } from '../lib/types';
import { Avatar } from './Avatar';

/** Eine Spielerzeile mit den in diesem Spiel verdienten LK-Punkten (Verlierer: +0.00, wie im Tennis). */
export function LkGainRow({ game, id, showChange }: { game: Game; id: string; showChange?: boolean }) {
  const { playersById, league } = useLeague();
  const p = playersById.get(id);
  const gain = league.gameRatings.get(game.id)?.gains[id] ?? 0;
  const s = league.players.get(id);
  return (
    <Link to={`/players/${id}`} className="flex items-center gap-3 rounded-xl bg-black/20 p-2">
      <Avatar player={p} size={40} />
      <span className="min-w-0 flex-1 truncate font-bold">{p?.name ?? '?'}</span>
      {showChange && s && (
        <span className="text-right text-xs text-white/70">
          {gain > 0 ? `LK ${formatLk(s.lk + gain)} → ${formatLk(s.lk)}` : `LK ${formatLk(s.lk)}`}
        </span>
      )}
      <span className={`w-24 text-right font-score text-2xl ${gain > 0 ? 'text-lime-300' : 'text-white/50'}`}>
        +{gain.toFixed(2)} LK
      </span>
    </Link>
  );
}
