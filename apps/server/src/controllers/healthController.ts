import type { Request, Response } from 'express';
import { getHealth } from '../services/healthService.js';

export function healthController(_req: Request, res: Response): void {
  const data = getHealth();
  res.json({ data });
}