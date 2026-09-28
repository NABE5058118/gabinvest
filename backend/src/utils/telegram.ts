import axios from 'axios';
import crypto from 'crypto';
import { createLogger } from './logger.ts';

const logger = createLogger('telegram');

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
}

export function validateTelegramInitData(initData: string, botToken: string): boolean {
  try {
    const url = new URL('http://localhost' + '/');
    url.hash = initData;
    const params = new URLSearchParams(url.hash.slice(1));
    const hash = params.get('hash');
    if (!hash) return false;

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
  } catch {
    return false;
  }
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<void> {
  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    });
  } catch (error) {
    logger.error('Failed to send Telegram message:', error);
  }
}

export function parseInitData(initData: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initData);
    const userStr = params.get('user');
    if (!userStr) return null;
    const parsed = JSON.parse(userStr);
    return {
      id: parsed.id,
      first_name: parsed.first_name,
      last_name: parsed.last_name,
      username: parsed.username,
      photo_url: parsed.photo_url,
      language_code: parsed.language_code,
      is_premium: parsed.is_premium,
      allows_write_to_pm: parsed.allows_write_to_pm,
    };
  } catch {
    return null;
  }
}
