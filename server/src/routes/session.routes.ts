import { Router } from 'express';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { authRequired, isAuthed, issueSession, clearSession } from '../middleware/appAuth.js';

export const sessionRouter = Router();

/** GET /api/session — does the app need a password, and am I already in? */
sessionRouter.get('/', (req, res) => {
  res.json({ authRequired: authRequired(), authenticated: isAuthed(req) });
});

/** POST /api/session/login — exchange the shared password for a session. */
sessionRouter.post('/login', (req, res) => {
  if (!authRequired()) return res.json({ ok: true }); // no gate configured
  const supplied = String(req.body?.password ?? '');
  const expected = config.appPassword;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return res.status(401).json({ error: 'Incorrect password.', code: 'BAD_PASSWORD' });
  issueSession(res);
  res.json({ ok: true });
});

/** POST /api/session/logout */
sessionRouter.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});
