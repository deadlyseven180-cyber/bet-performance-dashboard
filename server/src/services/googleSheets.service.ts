import fs from 'node:fs';
import crypto from 'node:crypto';
import { google, sheets_v4 } from 'googleapis';
import { config, isConfigured, GOOGLE_SCOPES } from '../config.js';
import { getAuthedOAuthClient } from './auth.service.js';
import { normalizeRows } from '../utils/normalize.js';
import { mockRows, mockMeta } from '../data/mockData.js';
import type { BetsPayload, SheetMeta } from '../types/bet.js';

/** Typed, friendly error carrying an HTTP status for the API layer. */
export class SheetsError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 500, code = 'SHEETS_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * The Google Sheets service is deliberately separated from the analytics
 * engine (which lives on the client). Its only job: authenticate, read cells,
 * and hand back normalized rows. It NEVER writes to the spreadsheet.
 */
async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  const source = config.dataSource;

  if (source === 'apikey') {
    if (!isConfigured.apikey())
      throw new SheetsError('GOOGLE_API_KEY is not configured.', 500, 'NO_API_KEY');
    return google.sheets({ version: 'v4', auth: config.googleApiKey });
  }

  if (source === 'service') {
    if (!isConfigured.service())
      throw new SheetsError('Service account credentials are not configured.', 500, 'NO_SERVICE_ACCOUNT');
    let credentials: Record<string, unknown> | undefined;
    if (config.serviceAccountJson) {
      credentials = JSON.parse(config.serviceAccountJson);
    } else if (config.serviceAccountKeyFile && fs.existsSync(config.serviceAccountKeyFile)) {
      credentials = JSON.parse(fs.readFileSync(config.serviceAccountKeyFile, 'utf8'));
    } else {
      throw new SheetsError('Service account key file not found.', 500, 'NO_SERVICE_ACCOUNT');
    }
    const auth = new google.auth.GoogleAuth({ credentials, scopes: GOOGLE_SCOPES });
    return google.sheets({ version: 'v4', auth });
  }

  if (source === 'oauth') {
    const client = getAuthedOAuthClient();
    if (!client)
      throw new SheetsError('Not connected to Google. Please authenticate.', 401, 'NOT_AUTHENTICATED');
    return google.sheets({ version: 'v4', auth: client });
  }

  throw new SheetsError('Sheets client unavailable in mock mode.', 500, 'MOCK_MODE');
}

function translateGoogleError(err: any): SheetsError {
  const status = err?.code || err?.response?.status;
  const reason = err?.errors?.[0]?.reason || err?.response?.data?.error?.status;
  if (status === 404) return new SheetsError('Spreadsheet not found. Check the spreadsheet ID.', 404, 'NOT_FOUND');
  if (status === 403)
    return new SheetsError(
      'Access denied. Share the sheet with the service account, or check API permissions.',
      403, 'FORBIDDEN',
    );
  if (status === 401) return new SheetsError('Authentication failed or expired. Reconnect Google.', 401, 'UNAUTHENTICATED');
  if (status === 429 || reason === 'RATE_LIMIT_EXCEEDED')
    return new SheetsError('Google API rate limit reached. Please wait and refresh.', 429, 'RATE_LIMITED');
  if (status === 400) return new SheetsError('Invalid request — the worksheet name may be wrong.', 400, 'BAD_REQUEST');
  return new SheetsError(err?.message || 'Failed to read from Google Sheets.', 502, 'UPSTREAM_ERROR');
}

/**
 * Short-lived response cache. The client polls every ~10s for near-realtime
 * updates; caching for a few seconds keeps those polls fast and stays well
 * within Google's per-user read quota if several viewers poll at once.
 */
const CACHE_TTL_MS = 6000;
const responseCache = new Map<string, { at: number; payload: BetsPayload }>();

/** Stable fingerprint of the raw cell grid — changes iff the sheet changes. */
function hashRows(rows: string[][]): string {
  return crypto.createHash('sha1').update(JSON.stringify(rows)).digest('hex');
}

/** Fetch spreadsheet metadata (title + list of worksheet tabs). */
export async function fetchMeta(spreadsheetId: string): Promise<Omit<SheetMeta, 'worksheet'>> {
  if (config.dataSource === 'mock') {
    return { spreadsheetId: mockMeta.spreadsheetId, spreadsheetTitle: mockMeta.spreadsheetTitle, worksheets: mockMeta.worksheets };
  }
  try {
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.get({ spreadsheetId, fields: 'properties.title,sheets.properties.title' });
    return {
      spreadsheetId,
      spreadsheetTitle: res.data.properties?.title ?? 'Untitled',
      worksheets: (res.data.sheets ?? []).map((s) => s.properties?.title ?? '').filter(Boolean),
    };
  } catch (err) {
    throw translateGoogleError(err);
  }
}

/** Read every betting record, normalized. */
export async function fetchBets(opts: {
  spreadsheetId?: string;
  worksheet?: string;
  force?: boolean;
}): Promise<BetsPayload> {
  const worksheet = opts.worksheet || config.defaultWorksheet;
  const syncedAt = new Date().toISOString();

  if (config.dataSource === 'mock') {
    const { bets, warnings } = normalizeRows(mockRows);
    return {
      bets, warnings, source: 'mock', syncedAt, recordCount: bets.length,
      hash: hashRows(mockRows), meta: { ...mockMeta, worksheet },
    };
  }

  const spreadsheetId = opts.spreadsheetId || config.defaultSpreadsheetId;
  if (!spreadsheetId)
    throw new SheetsError('No spreadsheet selected. Provide a spreadsheet ID.', 400, 'NO_SPREADSHEET');

  // Serve from cache when a very recent read exists (unless forced).
  const cacheKey = `${spreadsheetId}|${worksheet}`;
  const hit = responseCache.get(cacheKey);
  if (!opts.force && hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { ...hit.payload, cached: true };
  }

  try {
    const sheets = await getSheetsClient();

    // 1) Read spreadsheet metadata FIRST so we know the real tab names.
    const metaInfo = await fetchMeta(spreadsheetId);
    const warnings: string[] = [];

    // 2) Resolve which worksheet to read. If the requested/configured tab
    //    name doesn't exist, fall back to the first tab so connecting always
    //    works — the user can then switch tabs from the Data Source page.
    let resolved = worksheet;
    if (metaInfo.worksheets.length && !metaInfo.worksheets.includes(resolved)) {
      const fallback = metaInfo.worksheets[0];
      if (resolved) warnings.push(`Worksheet "${resolved}" not found — showing "${fallback}" instead. Pick the right tab in Data Source.`);
      resolved = fallback;
    }

    // 3) Read the cells of the resolved worksheet.
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: resolved,
      valueRenderOption: 'UNFORMATTED_VALUE',
      dateTimeRenderOption: 'FORMATTED_STRING',
    });
    const rows = (res.data.values ?? []).map((r) => (r as unknown[]).map((c) => (c == null ? '' : String(c))));
    const { bets, warnings: rowWarnings } = normalizeRows(rows);

    const payload: BetsPayload = {
      bets,
      warnings: [...warnings, ...rowWarnings],
      source: config.dataSource,
      syncedAt,
      recordCount: bets.length,
      hash: hashRows(rows),
      meta: { ...metaInfo, worksheet: resolved },
    };
    responseCache.set(cacheKey, { at: Date.now(), payload });
    return payload;
  } catch (err) {
    if (err instanceof SheetsError) throw err;
    throw translateGoogleError(err);
  }
}
