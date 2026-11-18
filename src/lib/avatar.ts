import { createAvatar } from '@dicebear/core';
import { adventurer, avataaars, bigSmile, bottts, funEmoji, lorelei, pixelArt, thumbs } from '@dicebear/collection';

export const AVATAR_STYLES = {
  adventurer: { label: 'Adventurer', style: adventurer },
  avataaars: { label: 'Comic', style: avataaars },
  bigSmile: { label: 'Big smile', style: bigSmile },
  bottts: { label: 'Robot', style: bottts },
  funEmoji: { label: 'Emoji', style: funEmoji },
  lorelei: { label: 'Sketch', style: lorelei },
  pixelArt: { label: 'Pixel', style: pixelArt },
  thumbs: { label: 'Thumbs', style: thumbs },
} as const;

export type AvatarStyle = keyof typeof AVATAR_STYLES;

const cache = new Map<string, string>();

export function avatarUri(style: string, seed: string): string {
  const key = `${style}:${seed}`;
  let uri = cache.get(key);
  if (!uri) {
    const def = AVATAR_STYLES[style as AvatarStyle] ?? AVATAR_STYLES.adventurer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uri = createAvatar(def.style as any, { seed }).toDataUri();
    cache.set(key, uri);
  }
  return uri;
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}
