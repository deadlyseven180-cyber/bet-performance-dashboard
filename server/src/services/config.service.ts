import { config } from '../config.js';

/**
 * Shared app config store, backed by a single `app_state` row in Supabase.
 * Both the local and hosted servers talk to the same project, so whatever one
 * device writes is immediately visible to every other device and viewer.
 *
 * Uses Supabase's PostgREST endpoint directly (via fetch) — no SDK dependency.
 * The key is held server-side only and the table is reached solely through our
 * password-gated API.
 */
const ROW_KEY = 'tracker';

export const configStoreEnabled = (): boolean =>
  Boolean(config.supabaseUrl && config.supabaseKey);

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
    ...extra,
  };
}

export interface StoredConfig {
  value: Record<string, unknown>;
  updatedAt: string | null;
}

export async function readConfig(): Promise<StoredConfig> {
  if (!configStoreEnabled()) return { value: {}, updatedAt: null };
  const url = `${config.supabaseUrl}/rest/v1/app_state?key=eq.${ROW_KEY}&select=value,updated_at`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`Config read failed (${res.status})`);
  const rows = (await res.json()) as { value: Record<string, unknown>; updated_at: string }[];
  const row = rows[0];
  return { value: row?.value ?? {}, updatedAt: row?.updated_at ?? null };
}

export async function writeConfig(value: Record<string, unknown>): Promise<StoredConfig> {
  if (!configStoreEnabled()) throw new Error('Config store is not configured.');
  const updatedAt = new Date().toISOString();
  const res = await fetch(`${config.supabaseUrl}/rest/v1/app_state`, {
    method: 'POST',
    headers: headers({
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify([{ key: ROW_KEY, value, updated_at: updatedAt }]),
  });
  if (!res.ok) throw new Error(`Config write failed (${res.status}): ${await res.text()}`);
  return { value, updatedAt };
}
