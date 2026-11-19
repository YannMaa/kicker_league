import { createAvatar } from '@dicebear/core';
import { adventurer, avataaars, bigSmile, bottts, funEmoji, lorelei, pixelArt, thumbs } from '@dicebear/collection';
import type { AvatarOptions, Mood } from './types';

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

/** Nur diese Stile bieten bei der Registrierung Hautfarbe, Haarfarbe und Stimmung an. Alle anderen Stile werden weiter angezeigt. */
export const CUSTOM_STYLES: AvatarStyle[] = ['adventurer', 'avataaars'];

export const SKIN_TONES = [
  { id: 'ffdbb4', label: 'Very light' },
  { id: 'edb98a', label: 'Light' },
  { id: 'd08b5b', label: 'Tan' },
  { id: 'ae5d29', label: 'Brown' },
  { id: '8d5524', label: 'Dark brown' },
  { id: '614335', label: 'Deep' },
];

export const HAIR_COLORS = [
  { id: '0e0e0e', label: 'Black' },
  { id: '4a312c', label: 'Dark brown' },
  { id: 'a55728', label: 'Brown' },
  { id: 'd6b370', label: 'Blond' },
  { id: 'c93305', label: 'Ginger' },
  { id: 'afafaf', label: 'Grey' },
  { id: 'f59797', label: 'Pink' },
  { id: '85c2c6', label: 'Teal' },
];

export const MOODS: { id: Mood; label: string; emoji: string }[] = [
  { id: 'happy', label: 'Happy', emoji: '😄' },
  { id: 'funny', label: 'Funny', emoji: '🤪' },
  { id: 'relaxed', label: 'Relaxed', emoji: '😌' },
  { id: 'cool', label: 'Cool', emoji: '😎' },
  { id: 'angry', label: 'Angry', emoji: '😠' },
  { id: 'surprised', label: 'Surprised', emoji: '😮' },
  { id: 'sad', label: 'Sad', emoji: '😢' },
];

export const DEFAULT_OPTIONS: AvatarOptions = { skinColor: 'edb98a', hairColor: '4a312c', mood: 'happy' };

/** Stimmung → Gesichtsteile je Stil. Beim Adventurer sind die Teile nur durchnummeriert, die Auswahl ist aus Sichtprüfung. */
const FACE: Record<string, Record<Mood, Record<string, string>>> = {
  adventurer: {
    happy: { eyes: 'variant19', mouth: 'variant05', eyebrows: 'variant10' },
    funny: { eyes: 'variant21', mouth: 'variant16', eyebrows: 'variant04' },
    relaxed: { eyes: 'variant20', mouth: 'variant29', eyebrows: 'variant12' },
    cool: { eyes: 'variant18', mouth: 'variant02', eyebrows: 'variant08' },
    angry: { eyes: 'variant05', mouth: 'variant11', eyebrows: 'variant01' },
    surprised: { eyes: 'variant01', mouth: 'variant15', eyebrows: 'variant06' },
    sad: { eyes: 'variant15', mouth: 'variant04', eyebrows: 'variant07' },
  },
  avataaars: {
    happy: { eyes: 'happy', mouth: 'smile', eyebrows: 'default' },
    funny: { eyes: 'winkWacky', mouth: 'tongue', eyebrows: 'upDown' },
    relaxed: { eyes: 'squint', mouth: 'smile', eyebrows: 'flatNatural' },
    cool: { eyes: 'default', mouth: 'smile', eyebrows: 'default', accessories: 'sunglasses' },
    angry: { eyes: 'default', mouth: 'serious', eyebrows: 'angry' },
    surprised: { eyes: 'surprised', mouth: 'screamOpen', eyebrows: 'raisedExcited' },
    sad: { eyes: 'default', mouth: 'sad', eyebrows: 'sadConcerned' },
  },
};

/** Comic-Frisuren ohne Hüte/Mützen, damit die Haarfarbe immer sichtbar ist. */
const COMIC_HAIR = [
  'bob', 'bun', 'curly', 'curvy', 'dreads', 'frida', 'fro', 'froBand', 'longButNotTooLong', 'miaWallace', 'shavedSides',
  'straight02', 'straight01', 'straightAndStrand', 'dreads01', 'dreads02', 'frizzle', 'shaggy', 'shaggyMullet',
  'shortCurly', 'shortFlat', 'shortRound', 'shortWaved', 'sides', 'theCaesar', 'theCaesarAndSidePart', 'bigHair',
];

function buildOptions(style: string, seed: string, o?: AvatarOptions | null): Record<string, unknown> {
  const opts: Record<string, unknown> = { seed };
  if (!o || !CUSTOM_STYLES.includes(style as AvatarStyle)) return opts;
  opts.skinColor = [o.skinColor];
  opts.hairColor = [o.hairColor];
  for (const [k, v] of Object.entries(FACE[style]?.[o.mood] ?? {})) {
    opts[k] = [v];
    opts[`${k}Probability`] = 100;
  }
  if (style === 'adventurer') {
    opts.hairProbability = 100;
    opts.glassesProbability = 0; // Brillen würden die Stimmung verdecken
  }
  if (style === 'avataaars') {
    opts.top = COMIC_HAIR;
    opts.topProbability = 100;
    if (o.mood !== 'cool') opts.accessoriesProbability = 0; // nur "Cool" trägt eine Sonnenbrille
  }
  return opts;
}

const cache = new Map<string, string>();

export function avatarUri(style: string, seed: string, options?: AvatarOptions | null): string {
  const key = `${style}:${seed}:${options ? `${options.skinColor}.${options.hairColor}.${options.mood}` : ''}`;
  let uri = cache.get(key);
  if (!uri) {
    const def = AVATAR_STYLES[style as AvatarStyle] ?? AVATAR_STYLES.adventurer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uri = createAvatar(def.style as any, buildOptions(style, seed, options) as any).toDataUri();
    cache.set(key, uri);
  }
  return uri;
}

export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}
