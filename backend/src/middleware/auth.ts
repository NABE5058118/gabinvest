import { Request, Response, NextFunction } from 'express';
import { validateTelegramInitData } from '../utils/telegram';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const initData = req.headers['x-telegram-init-data'] as string | undefined;

  if (!initData) {
    return res.status(401).json({ error: 'Missing Telegram init data' });
  }

  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const isValid = validateTelegramInitData(initData, BOT_TOKEN);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid Telegram init data' });
  }

  next();
}
