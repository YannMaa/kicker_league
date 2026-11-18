/**
 * Exportiert alle Tabellen als JSON nach backup/.
 * Nutzung: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run backup
 * (Lokal werden VITE_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY aus .env gelesen.)
 */
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadEnv } from './env';

const env = loadEnv();
const rawUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!rawUrl || !key) throw new Error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.');

// Nur die Basisadresse verwenden (falls versehentlich /rest/v1/ o.ä. mitkopiert wurde)
const url = new URL(rawUrl.trim()).origin;
const sb = createClient(url, key.trim(), { auth: { persistSession: false } });
const tables = ['labs', 'players', 'games'] as const;

mkdirSync('backup', { recursive: true });
for (const t of tables) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(t).select('*').order('created_at').order('id').range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  // Stabile Sortierung → saubere Git-Diffs
  writeFileSync(`backup/${t}.json`, JSON.stringify(rows, null, 2) + '\n');
  console.log(`${t}: ${rows.length} Zeilen`);
}
