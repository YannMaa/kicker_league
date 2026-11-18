-- =====================================================================
--  AIBE Kicker-Liga – Datenbankschema
--  Ausführen: Supabase Dashboard → SQL Editor → New query → alles einfügen → Run
--  Das Skript ist idempotent (kann mehrfach ausgeführt werden).
-- =====================================================================

-- ---------- Tabellen ----------
create table if not exists public.labs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(trim(name)) between 1 and 40),
  created_at  timestamptz not null default now()
);

create table if not exists public.players (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(trim(name)) between 1 and 30),
  lab_id        uuid references public.labs(id) on delete set null,
  avatar_style  text not null default 'adventurer' check (char_length(avatar_style) <= 40),
  avatar_seed   text not null default 'kicker'     check (char_length(avatar_seed) <= 60),
  created_at    timestamptz not null default now()
);
-- Soft-Delete: entfernte Spieler bleiben samt Spielhistorie erhalten (Wiederherstellen: archived_at auf NULL setzen)
alter table public.players add column if not exists archived_at timestamptz;
-- Namen eindeutig unter aktiven Spielern (Groß-/Kleinschreibung egal)
drop index if exists public.players_name_unique;
create unique index if not exists players_name_active_unique on public.players (lower(trim(name))) where archived_at is null;

create table if not exists public.games (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  mode        text not null check (mode in ('1v1', '2v2')),
  red_1       uuid not null references public.players(id) on delete restrict,
  red_2       uuid          references public.players(id) on delete restrict,
  blue_1      uuid not null references public.players(id) on delete restrict,
  blue_2      uuid          references public.players(id) on delete restrict,
  score_red   smallint not null check (score_red  between 0 and 99),
  score_blue  smallint not null check (score_blue between 0 and 99),
  constraint no_draw check (score_red <> score_blue),
  constraint mode_matches_players check (
    (mode = '1v1' and red_2 is null and blue_2 is null) or
    (mode = '2v2' and red_2 is not null and blue_2 is not null)
  ),
  constraint distinct_players check (
    red_1 <> blue_1
    and (red_2  is null or (red_2  <> red_1 and red_2 <> blue_1))
    and (blue_2 is null or (blue_2 <> red_1 and blue_2 <> blue_1))
    and (red_2 is null or blue_2 is null or red_2 <> blue_2)
  )
);
-- Soft-Delete: gelöschte Spiele bleiben in der DB/Backup, zählen aber nicht mehr (Wiederherstellen: deleted_at auf NULL setzen)
alter table public.games add column if not exists deleted_at timestamptz;
create index if not exists games_created_at_idx on public.games (created_at);

-- ---------- Row Level Security ----------
alter table public.labs    enable row level security;
alter table public.players enable row level security;
alter table public.games   enable row level security;

drop policy if exists "read labs"    on public.labs;
drop policy if exists "read players" on public.players;
drop policy if exists "read games"   on public.games;
drop policy if exists "add labs"     on public.labs;
drop policy if exists "add players"  on public.players;
drop policy if exists "add games"    on public.games;
drop policy if exists "undo recent game" on public.games;
drop policy if exists "archive player" on public.players;
drop policy if exists "archive game" on public.games;

-- Jeder darf lesen
create policy "read labs"    on public.labs    for select to anon, authenticated using (true);
create policy "read players" on public.players for select to anon, authenticated using (true);
create policy "read games"   on public.games   for select to anon, authenticated using (true);

-- Jeder darf eintragen
create policy "add labs"    on public.labs    for insert to anon, authenticated with check (true);
create policy "add players" on public.players for insert to anon, authenticated with check (true);
create policy "add games"   on public.games   for insert to anon, authenticated with check (true);

-- Spiel löschen = archivieren (deleted_at setzen). Echtes DELETE ist für anon/authenticated nicht erlaubt.
create policy "archive game" on public.games for update to anon, authenticated
  using (deleted_at is null) with check (deleted_at is not null);

-- Spieler entfernen = archivieren. Erlaubt ist NUR das Setzen von archived_at (kein Wiederherstellen, kein Umbenennen).
create policy "archive player" on public.players for update to anon, authenticated
  using (archived_at is null) with check (archived_at is not null);

-- Sonst keine UPDATE-Rechte → alles andere ändern nur über das Dashboard (service_role).

-- ---------- Spalten-Rechte ----------
-- Anon darf id/created_at NICHT selbst setzen (sonst könnte man Spiele „zurückdatieren“).
revoke insert, update, delete on public.labs, public.players, public.games from anon, authenticated;
grant select on public.labs, public.players, public.games to anon, authenticated;
grant insert (name)                                   on public.labs    to anon, authenticated;
grant insert (name, lab_id, avatar_style, avatar_seed) on public.players to anon, authenticated;
grant insert (mode, red_1, red_2, blue_1, blue_2, score_red, score_blue) on public.games to anon, authenticated;
grant update (archived_at) on public.players to anon, authenticated;
grant update (deleted_at)  on public.games   to anon, authenticated;

-- ---------- Admin-Rechte (Backup/Restore, Dashboard-Korrekturen) ----------
-- Neue Supabase-Projekte vergeben diese Rechte nicht mehr automatisch.
grant all on public.labs, public.players, public.games to service_role;
