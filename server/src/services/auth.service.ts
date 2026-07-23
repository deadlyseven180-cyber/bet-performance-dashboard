import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';
import { config, GOOGLE_SCOPES, isConfigured } from '../config.js';

/**
 * OAuth 2.0 helper. Tokens are persisted to disk for this single-user setup;
 * the storage layer is intentionally isolated so a real multi-user token store
 * (DB row per user) can replace it later without touching the rest of the app.
 */
const TOKEN_DIR = path.resolve(process.cwd(), 'data');
const TOKEN_FILE = path.join(TOKEN_DIR, 'tokens.json');

export function createOAuthClient() {
  return new google.auth.OAuth2(
    config.oauth.clientId,
    config.oauth.clientSecret,
    config.oauth.redirectUri,
  );
}

export function getAuthUrl(): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
  });
}

export async function exchangeCode(code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  saveTokens(tokens);
  return tokens;
}

function saveTokens(tokens: unknown) {
  try {
    if (!fs.existsSync(TOKEN_DIR)) fs.mkdirSync(TOKEN_DIR, { recursive: true });
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist OAuth tokens:', err);
  }
}

export function loadTokens(): Record<string, unknown> | null {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  } catch {
    return null;
  }
}

export function clearTokens() {
  try { if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE); } catch { /* ignore */ }
}

export function getAuthedOAuthClient() {
  const client = createOAuthClient();

  // Preferred for hosting: a refresh token supplied via env. googleapis will
  // mint access tokens automatically — no token file, survives redeploys.
  if (config.googleRefreshToken) {
    client.setCredentials({ refresh_token: config.googleRefreshToken });
    return client;
  }

  // Otherwise fall back to tokens saved by the interactive OAuth flow.
  const tokens = loadTokens();
  if (!tokens) return null;
  client.setCredentials(tokens);
  client.on('tokens', (t) => saveTokens({ ...tokens, ...t }));
  return client;
}

export function hasGrant(): boolean {
  return Boolean(config.googleRefreshToken) || Boolean(loadTokens());
}

export function authStatus() {
  return {
    mode: config.dataSource,
    oauthConfigured: isConfigured.oauth(),
    connected: config.dataSource === 'oauth' ? hasGrant() : true,
  };
}
