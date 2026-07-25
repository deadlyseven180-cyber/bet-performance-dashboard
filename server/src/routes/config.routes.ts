import { Router } from 'express';
import { z } from 'zod';
import { configStoreEnabled, readConfig, writeConfig } from '../services/config.service.js';

export const configRouter = Router();

/** GET /api/config — the shared tracker config (empty object if unset). */
configRouter.get('/', async (_req, res, next) => {
  try {
    if (!configStoreEnabled()) return res.json({ enabled: false, value: {}, updatedAt: null });
    const stored = await readConfig();
    res.json({ enabled: true, ...stored });
  } catch (err) {
    next(err);
  }
});

const bodySchema = z.object({ value: z.record(z.unknown()) });

/** PUT /api/config — replace the shared tracker config. */
configRouter.put('/', async (req, res, next) => {
  try {
    if (!configStoreEnabled()) return res.status(501).json({ error: 'Config store not configured.', code: 'NO_STORE' });
    const { value } = bodySchema.parse(req.body);
    const stored = await writeConfig(value);
    res.json({ enabled: true, ...stored });
  } catch (err) {
    next(err);
  }
});
