import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { SheetsError } from '../services/googleSheets.service.js';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Invalid request parameters.', code: 'BAD_REQUEST', details: err.flatten() });
  }
  if (err instanceof SheetsError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  const message = err instanceof Error ? err.message : 'Unexpected server error.';
  console.error('[error]', err);
  res.status(500).json({ error: message, code: 'INTERNAL_ERROR' });
}
