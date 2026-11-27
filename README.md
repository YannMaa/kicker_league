# ⚽ AIBE Foosball League

Tischkicker-Tabelle fürs Büro: QR-Code scannen → registrieren → Spiel eintragen → Tabelle, LK, Insights.

**Stack:** Vite + React + TypeScript + Tailwind · Supabase (Postgres) · Vercel (Hosting) · GitHub Actions (tägliches Backup)

## Lokal ausprobieren (ohne Supabase)
```bash
npm install
npm run dev      # → Demo-Modus mit Beispieldaten im Browser
npm test         # Tests für LK/Tabelle/Insights
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
`https://<deine-url>/qr` öffnen → **Drucken**. Der Code führt direkt auf `/game`.

## Avatare
Bei der Registrierung gibt es zwei Stile (Adventurer, Comic). Man wählt Hautfarbe, Haarfarbe und Stimmung (Happy, Funny, Relaxed, Cool, Angry, Surprised, Sad). Gespeichert wird nur die Auswahl (`players.avatar_options`), das Bild entsteht daraus im Browser. Ältere Spieler ohne Auswahl behalten ihren Avatar. Über den ✏️-Button im Profil lassen sich Name, Lab und Avatar später ändern (sonst nichts). Zuordnung Stimmung → Gesichtsteile: `src/lib/avatar.ts`.

## Wiederherstellen
Alle Statistiken werden aus den Rohdaten (labs/players/games) berechnet, nur die sind im Backup.
1. Neues Supabase-Projekt, `schema.sql` ausführen.
2. `SUPABASE_URL=<neu> SUPABASE_SERVICE_ROLE_KEY=<neu> npm run restore`
3. URL/anon key in Vercel anpassen. Fertig.

## Sicherheit
- Jeder darf lesen sowie Spieler/Spiele anlegen. Löschen nur für Spiele < 5 Min alt (Undo).
- **Spiele löschen** = archivieren (`games.deleted_at`), echtes DELETE ist nicht erlaubt. Gelöschte Spiele zählen nicht mehr, bleiben aber im Backup. Wiederherstellen: `deleted_at` auf `NULL` setzen.
- **Spieler entfernen** = archivieren (`players.archived_at`). Die Spielhistorie bleibt erhalten. Wiederherstellen: im Supabase **Table Editor** `archived_at` der Zeile auf `NULL` setzen.
- Sonstige Korrekturen: Supabase **Table Editor** (Admin).
- `service_role` key gehört nur in `.env` (lokal) und GitHub Secrets, nie ins Frontend.

## Score-System
- **Tabelle:** sortiert nach LK (beste zuerst), bei Gleichstand Siege, dann Tordifferenz.
- **LK (Leistungsklasse)** nach dem Verfahren des Deutschen Tennis Bundes (Durchführungsbestimmungen zur LKO, Stand 01.01.2024):
  - LK 1,5 = beste, 25 = schlechteste Stufe, Anzeige mit einer Nachkommastelle (abgeschnitten). Start bei **LK 24,0**.
  - **Nur der Sieger verbessert sich**, um `P / H`; der Verlierer bleibt unverändert.
    `P` (10 … 110) hängt von der LK-Differenz der Gegner ab (Sieg gegen Stärkere = mehr Punkte), `H = 10 × (30 − LK)` ist die Hürde (je besser, desto mehr Punkte pro Stufe).
  - **Doppel:** Team-LK = Durchschnitt der Partner. `P / H` wird einmal berechnet und **je zur Hälfte** auf beide Sieger verteilt.
  - **Wöchentlich** (Montag) werden alle LK um 0,1 schlechter (Motivationsaufschlag, max. 25; im Tennis 0,025). Wochen vor dem 23.11.2026 rechnen weiter mit 0,025. Jedes Spiel wird gegen die LK bewertet, die die Spieler direkt davor hatten (im Tennis: Wochenstand, hier bewusst aktueller Stand).
  - Nicht übernommen: Altersfaktor, Zählweisenfaktor, Mannschafts-/Meisterschaftsboni, Nichtantreten, Erlass des Aufschlags nach 12 Monaten Pause.
  - Das Tor-Ergebnis zählt, wie im Tennis, nur für Sieg/Niederlage, nicht für die LK. Es zählt für Tabelle und Tordifferenz.
Formeln und Konstanten stehen in `src/lib/rating.ts`. Alles wird aus den Spielen berechnet, nichts davon ist in der Datenbank gespeichert.
