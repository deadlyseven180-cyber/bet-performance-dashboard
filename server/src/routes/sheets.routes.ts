import { Router } from 'express';
import { z } from 'zod';
import { config, isProd } from '../config.js';
import { fetchBets, fetchMeta, SheetsError } from '../services/googleSheets.service.js';

export const sheetsRouter = Router();

const querySchema = z.object({
  spreadsheetId: z.string().trim().optional(),
  worksheet: z.string().trim().optional(),
});

/** GET /api/sheets/bets — read + normalize all betting records. */
sheetsRouter.get('/bets', async (req, res, next) => {
  try {
    const { spreadsheetId, worksheet } = querySchema.parse(req.query);
    // In a hosted deployment the data source is fixed by server config —
    // viewers cannot re-point the app at another spreadsheet via the API.
    const payload = await fetchBets(isProd() ? {} : { spreadsheetId, worksheet });
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

/** GET /api/sheets/meta — spreadsheet title + worksheet tabs (for the picker). */
sheetsRouter.get('/meta', async (req, res, next) => {
  try {
    const spreadsheetId = isProd()
      ? config.defaultSpreadsheetId
      : String(req.query.spreadsheetId ?? config.defaultSpreadsheetId ?? '');
    if (!spreadsheetId && config.dataSource !== 'mock')
      throw new SheetsError('spreadsheetId is required.', 400, 'NO_SPREADSHEET');
    const meta = await fetchMeta(spreadsheetId);
    res.json(meta);
  } catch (err) {
    next(err);
  }
});

/** GET /api/sheets/config — tell the client which data source is active. */
sheetsRouter.get('/config', (_req, res) => {
  res.json({
    dataSource: config.dataSource,
    defaultSpreadsheetId: config.defaultSpreadsheetId,
    defaultWorksheet: config.defaultWorksheet,
  });
});
