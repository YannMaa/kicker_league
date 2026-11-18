/**
 * Spielt backup/*.json in eine (neue, leere) Supabase-DB ein.
 * Vorher schema.sql im Ziel-Projekt ausführen!
 * Nutzung: SUPABASE_URL=<ziel> SUPABASE_SERVICE_ROLE_KEY=<ziel-key> npm run restore
 * Die Reihenfolge (labs → players → games) und alle IDs/Zeitstempel bleiben erhalten.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { loadEnv } from './env';

const env = loadEnv();
const rawUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!rawUrl || !key) throw new Error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.');

// Nur die Basisadresse verwenden (falls versehentlich /rest/v1/ o.ä. mitkopiert wurde)
const url = new URL(rawUrl.trim()).origin;
const sb = createClient(url, key.trim(), { auth: { persistSession: false } });
for (const t of ['labs', 'players', 'games'] as const) {
  const rows = JSON.parse(readFileSync(`backup/${t}.json`, 'utf8')) as object[];
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from(t).upsert(rows.slice(i, i + 500), { onConflict: 'id' });
    if (error) throw error;
  }
  console.log(`${t}: ${rows.length} Zeilen wiederhergestellt`);
}
