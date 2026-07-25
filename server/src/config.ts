import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Load the monorepo-root .env first (works from both src/ and dist/),
// then fall back to a server-local .env. Existing vars are never overridden.
const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, '../../.env') });
loadEnv();

export type DataSource = 'mock' | 'apikey' | 'service' | 'oauth';

const asString = (v: string | undefined, fallback = ''): string =>
  (v ?? '').trim() || fallback;

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: asString(process.env.NODE_ENV, 'development'),
  clientOrigins: asString(process.env.CLIENT_ORIGIN, 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  dataSource: asString(process.env.DATA_SOURCE, 'mock') as DataSource,

  defaultSpreadsheetId: asString(process.env.SPREADSHEET_ID),
  defaultWorksheet: asString(process.env.WORKSHEET_NAME, 'Sheet1'),

  googleApiKey: asString(process.env.GOOGLE_API_KEY),

  serviceAccountKeyFile: asString(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE),
  serviceAccountJson: asString(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),

  oauth: {
    clientId: asString(process.env.GOOGLE_CLIENT_ID),
    clientSecret: asString(process.env.GOOGLE_CLIENT_SECRET),
    redirectUri: asString(
      process.env.GOOGLE_OAUTH_REDIRECT_URI,
      'http://localhost:4000/api/auth/google/callback',
    ),
  },

  // Durable Google grant for hosting: when set, the app reads the sheet using
  // this refresh token (survives restarts/redeploys, no interactive login).
  googleRefreshToken: asString(process.env.GOOGLE_REFRESH_TOKEN),

  // Viewer access gate. When APP_PASSWORD is set, the whole app requires a
  // shared password (essential for a public deployment). Left blank locally so
  // dev stays frictionless.
  appPassword: asString(process.env.APP_PASSWORD),
  sessionSecret: asString(process.env.SESSION_SECRET, 'dev-insecure-secret-change-me'),

  // Shared config store (Supabase). When set, the bet-tracker config is stored
  // here so it's shared across every device and viewer. Both local and hosted
  // servers point at the same project, so changes sync everywhere.
  supabaseUrl: asString(process.env.SUPABASE_URL),
  supabaseKey: asString(process.env.SUPABASE_ANON_KEY),
};

/** True in a hosted/production environment. */
export const isProd = () => config.nodeEnv === 'production';

/**
 * Read-only scope — the app NEVER writes to the spreadsheet.
 * spreadsheets.readonly covers both spreadsheets.get (tab list) and
 * values.get (cell data), so no Drive scope is needed. Keeping it to a
 * single scope means a lighter Google consent screen.
 */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

export const isConfigured = {
  apikey: () => Boolean(config.googleApiKey),
  service: () =>
    Boolean(config.serviceAccountJson) || Boolean(config.serviceAccountKeyFile),
  oauth: () => Boolean(config.oauth.clientId && config.oauth.clientSecret),
};
