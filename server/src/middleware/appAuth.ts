import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config, isProd } from '../config.js';

/**
 * Lightweight viewer-access gate. When APP_PASSWORD is set (i.e. on a public
 * deployment) every /api/sheets request requires a valid signed session
 * cookie, obtained by POSTing the shared password to /api/session/login.
 *
 * Deliberately dependency-free: an HMAC-signed cookie, no session store, so it
 * works on ephemeral hosting. This is a shared-password gate, not per-user
 * auth — the architecture leaves room to swap in real user accounts later.
 */
const COOKIE = 'bpd_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function sign(value: string): string {
  const mac = crypto.createHmac('sha256', config.sessionSecret).update(value).digest('base64url');
  return `${value}.${mac}`;
}

function verify(signed: string | undefined): boolean {
  if (!signed) return false;
  const idx = signed.lastIndexOf('.');
  if (idx < 0) return false;
  const value = signed.slice(0, idx);
  const expected = sign(value);
  // constant-time compare
  const a = Buffer.from(signed);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  const ts = Number(value.split(':')[1] ?? 0);
  return Number.isFinite(ts) && Date.now() - ts < MAX_AGE_MS;
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

export function issueSession(res: Response) {
  const token = sign(`ok:${Date.now()}`);
  const secure = isProd() ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${Math.floor(MAX_AGE_MS / 1000)}; SameSite=Lax${secure}`,
  );
}

export function clearSession(res: Response) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

/** Auth is only enforced when a password is configured. */
export const authRequired = (): boolean => Boolean(config.appPassword);

export function isAuthed(req: Request): boolean {
  if (!authRequired()) return true;
  return verify(readCookie(req, COOKIE));
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (isAuthed(req)) return next();
  res.status(401).json({ error: 'Password required.', code: 'LOCKED' });
}
