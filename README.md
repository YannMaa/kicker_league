# ⚽ AIBE Kicker-Liga

Tischkicker-Tabelle fürs Büro: QR-Code scannen → registrieren → Spiel eintragen → Tabelle, Elo, Insights, Trainingsempfehlungen.

**Stack:** Vite + React + TypeScript + Tailwind · Supabase (Postgres) · Vercel (Hosting) · GitHub Actions (tägliches Backup)

## Lokal ausprobieren (ohne Supabase)
```bash
npm install
npm run dev      # → Demo-Modus mit Beispieldaten im Browser
npm test         # Tests für Elo/Tabelle/Insights
```

## Einrichtung (einmalig, ca. 15 Min)

### 1. Supabase (Datenbank)
1. https://supabase.com → Account → **New project** (Region *Frankfurt*, Passwort notieren).
2. **SQL Editor → New query** → Inhalt von `supabase/schema.sql` einfügen → **Run**.
3. **Project Settings → API**: kopiere *Project URL*, *anon public key* und *service_role key* (geheim!).
4. Lokal: `cp .env.example .env` und die Werte eintragen.

### 2. GitHub (Code + Backup)
1. Neues Repo (privat ok) anlegen und pushen.
2. **Settings → Secrets and variables → Actions** → `SUPABASE_URL` und `SUPABASE_SERVICE_ROLE_KEY` anlegen.
3. **Actions → Daily backup → Run workflow** zum Testen. Danach läuft es täglich und committet `backup/*.json`.

### 3. Vercel (Hosting)
1. https://vercel.com → mit GitHub anmelden → **Add New → Project** → Repo importieren.
2. Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (der **anon** key, nie service_role!).
3. Deploy. Jeder `git push` deployt automatisch neu, so änderst du die Seite jederzeit.

### 4. QR-Code
`https://<deine-url>/qr` öffnen → **Drucken**. Der Code führt direkt auf `/spiel`.

## Wiederherstellen
Alle Statistiken werden aus den Rohdaten (labs/players/games) berechnet, nur die sind im Backup.
1. Neues Supabase-Projekt, `schema.sql` ausführen.
2. `SUPABASE_URL=<neu> SUPABASE_SERVICE_ROLE_KEY=<neu> npm run restore`
3. URL/anon key in Vercel anpassen. Fertig.

## Sicherheit
- Jeder darf lesen, Spieler/Spiele anlegen. Kein Update. Löschen nur für Spiele < 5 Min alt (Rückgängig).
- Korrekturen/Löschungen: Supabase **Table Editor** (Admin).
- `service_role` key gehört nur in `.env` (lokal) und GitHub Secrets, nie ins Frontend.

## Score-System
- **Tabelle:** Sieg 1 Punkt → Tordifferenz → geschossene Tore.
- **Elo:** Start 1000, Teamschnitt, Torfaktor `1+ln(1+|TD|)/3`, K=40 (erste 10 Spiele) dann 24. Unter 5 Spielen = Rookie.
- **Quote:** `(Siege+2,5)/(Spiele+5)`.
Formeln in `src/lib/rating.ts`, Konstanten oben in der Datei.
