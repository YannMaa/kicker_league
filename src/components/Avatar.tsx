import { avatarUri } from '../lib/avatar';
import type { Player } from '../lib/types';

export function Avatar({ player, size = 40, ring }: { player?: Player | null; size?: number; ring?: 'red' | 'blue' }) {
  const ringCls = ring === 'red' ? 'ring-team-black' : ring === 'blue' ? 'ring-team-white' : 'ring-white/80';
  if (!player)
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-full border-2 border-dashed border-white/50 bg-black/30 text-white/60"
      >
        ?
      </div>
    );
  return (
    <img
      src={avatarUri(player.avatar_style, player.avatar_seed, player.avatar_options)}
      alt={player.name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`shrink-0 rounded-full bg-white/90 ring-2 ${ringCls}`}
    />
  );
}
