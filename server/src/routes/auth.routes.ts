import { Router } from 'express';
import { config, isConfigured, isProd } from '../config.js';
import { getAuthUrl, exchangeCode, clearTokens, authStatus } from '../services/auth.service.js';

export const authRouter = Router();

/** GET /api/auth/status — is Google connected? */
authRouter.get('/status', (_req, res) => {
  res.json(authStatus());
});

/** GET /api/auth/google — begin the OAuth 2.0 flow. */
authRouter.get('/google', (_req, res, next) => {
  try {
    if (!isConfigured.oauth())
      return res.status(500).json({ error: 'OAuth is not configured on the server.' });
    res.redirect(getAuthUrl());
  } catch (err) {
    next(err);
  }
});

/** GET /api/auth/google/callback — OAuth redirect target. */
authRouter.get('/google/callback', async (req, res, next) => {
  try {
    const code = String(req.query.code ?? '');
    if (!code) return res.status(400).send('Missing authorization code.');
    await exchangeCode(code);
    // In production the client is same-origin, so redirect to a relative path;
    // in dev, bounce back to the Vite dev server origin.
    const base = isProd() ? '' : (config.clientOrigins[0] ?? '');
    res.redirect(`${base}/?connected=1`);
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/logout — forget stored tokens. */
authRouter.post('/logout', (_req, res) => {
  clearTokens();
  res.json({ ok: true });
});
