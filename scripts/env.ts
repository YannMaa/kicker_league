import { existsSync, readFileSync } from 'node:fs';

/** process.env + optionale .env-Datei (ohne zusätzliche Abhängigkeit). */
export function loadEnv(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  if (existsSync('.env')) {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return { ...out, ...process.env };
}
