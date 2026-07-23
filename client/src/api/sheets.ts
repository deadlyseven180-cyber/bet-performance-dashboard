import { apiGet, apiPost } from './client';
import type { AppConfig, BetsPayload, SheetMeta } from '@/types';

export interface AuthStatus {
  mode: string;
  oauthConfigured: boolean;
  connected: boolean;
}

export interface SessionInfo {
  authRequired: boolean;
  authenticated: boolean;
}

export const sessionApi = {
  get: () => apiGet<SessionInfo>('/session'),
  login: (password: string) => apiPost<{ ok: boolean }>('/session/login', { password }),
  logout: () => apiPost<{ ok: boolean }>('/session/logout'),
};

export const sheetsApi = {
  getConfig: () => apiGet<AppConfig>('/sheets/config'),
  getBets: (spreadsheetId?: string, worksheet?: string) =>
    apiGet<BetsPayload>('/sheets/bets', { spreadsheetId, worksheet }),
  getMeta: (spreadsheetId?: string) =>
    apiGet<SheetMeta>('/sheets/meta', { spreadsheetId }),
  authStatus: () => apiGet<AuthStatus>('/auth/status'),
  logout: () => apiPost<{ ok: boolean }>('/auth/logout'),
};
