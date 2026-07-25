import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { config, isProd } from './config.js';
import { sheetsRouter } from './routes/sheets.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { sessionRouter } from './routes/session.routes.js';
import { configRouter } from './routes/config.routes.js';
import { requireAuth, authRequired } from './middleware/appAuth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
app.set('trust proxy', 1); // required for Secure cookies behind Render's proxy

app.use(compression());
app.use(express.json());
app.use(
  cors({
    origin: config.clientOrigins.length ? config.clientOrigins : true,
    credentials: true,
  }),
);
if (config.nodeEnv !== 'test') app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', dataSource: config.dataSource, locked: authRequired(), time: new Date().toISOString() });
});

// Viewer password gate + Google OAuth (both unprotected so users can log in).
app.use('/api/session', sessionRouter);
app.use('/api/auth', authRouter);

// Data endpoints require a valid session when APP_PASSWORD is set.
app.use('/api/sheets', requireAuth, sheetsRouter);
app.use('/api/config', requireAuth, configRouter);

app.use('/api', notFound);

// ── Serve the built client in production (single-service deploy) ──────────
if (isProd()) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // dist layout: server/dist/index.js  →  ../../client/dist
  const clientDir = path.resolve(here, '../../client/dist');
  if (fs.existsSync(clientDir)) {
    app.use(express.static(clientDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDir, 'index.html'));
    });
    console.log(`   Serving client from ${clientDir}`);
  } else {
    console.warn(`   ⚠ Client build not found at ${clientDir} — run "npm run build".`);
  }
}

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`\n🎯 Bet Dashboard running on http://localhost:${config.port}`);
  console.log(`   Data source: ${config.dataSource.toUpperCase()}  •  Password gate: ${authRequired() ? 'ON' : 'off'}`);
  if (config.dataSource === 'mock')
    console.log('   (Using built-in sample data — set DATA_SOURCE in .env to connect Google Sheets)\n');
});
