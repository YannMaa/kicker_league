export interface Lab {
  id: string;
  name: string;
  created_at: string;
}

export interface Player {
  id: string;
  name: string;
  lab_id: string | null;
  avatar_style: string;
  avatar_seed: string;
  created_at: string;
  /** gesetzt = Spieler wurde entfernt (Historie bleibt) */
  archived_at: string | null;
}

export type Mode = '1v1' | '2v2';
/** Intern/DB-Namen bleiben aus Kompatibilität: 'red' = Team Black, 'blue' = Team White. */
export type Side = 'red' | 'blue';

export interface Game {
  id: string;
  created_at: string;
  mode: Mode;
  red_1: string;
  red_2: string | null;
  blue_1: string;
  blue_2: string | null;
  score_red: number;
  score_blue: number;
  /** gesetzt = Spiel wurde gelöscht (bleibt im Backup, zählt nicht mehr) */
  deleted_at: string | null;
}

export type NewGame = Omit<Game, 'id' | 'created_at' | 'deleted_at'>;
