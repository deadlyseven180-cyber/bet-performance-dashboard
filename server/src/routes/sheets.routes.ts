import { Router } from 'express';
import { config } from '../config.js';
import { fetchBets, fetchMeta } from '../services/googleSheets.service.js';

export const sheetsRouter = Router();

/**
 * GET /api/sheets/bets — read the betting records.
 * The spreadsheet and worksheet are fixed by server config; any query params
 * are ignored so no client can point the app at another sheet or tab.
 */
sheetsRouter.get('/bets', async (_req, res, next) => {
  try {
    const payload = await fetchBets();
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sheets/meta — spreadsheet title + the single locked worksheet.
 * Deliberately does NOT return the list of other tabs in the spreadsheet.
 */
sheetsRouter.get('/meta', async (_req, res, next) => {
  try {
    if (config.dataSource === 'mock') {
      return res.json({ spreadsheetTitle: 'Sample Betting Log (Demo Data)', worksheet: config.defaultWorksheet });
    }
    const meta = await fetchMeta(config.defaultSpreadsheetId);
    // Strip the full worksheet list — only reveal the one this app is locked to.
    res.json({ spreadsheetTitle: meta.spreadsheetTitle, worksheet: config.defaultWorksheet });
  } catch (err) {
    next(err);
  }
});

/** GET /api/sheets/config — the fixed data source (no spreadsheet id exposed). */
sheetsRouter.get('/config', (_req, res) => {
  res.json({ dataSource: config.dataSource, worksheet: config.defaultWorksheet });
});
