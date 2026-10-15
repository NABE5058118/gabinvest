import axios from 'axios';
import crypto from 'crypto';
import { createLogger } from './logger.js';

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
    const authDateValue = params.get('auth_date');
    if (!hash || !authDateValue || !/^\d+$/.test(authDateValue)) return false;

    const authDate = Number(authDateValue);
    const now = Math.floor(Date.now() / 1000);
    // Accept only recently issued Telegram WebApp data (at most 24 hours old or in the future).
    if (!Number.isSafeInteger(authDate) || Math.abs(now - authDate) > 24 * 60 * 60) return false;

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

    const expected = Buffer.from(signature, 'hex');
    const supplied = Buffer.from(hash, 'hex');
    if (expected.length !== supplied.length) return false;
    return crypto.timingSafeEqual(expected, supplied);
  } catch {
    return false;
  }
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<void> {
  const delays = [0, 400, 1200];
  for (let attempt = 0; attempt < delays.length; attempt += 1) {
    if (delays[attempt]) await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    try {
      const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }, { timeout: 8000 });
      if (response.data?.ok === false) throw new Error('Telegram API returned ok=false');
      return;
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      logger.warn('Telegram sendMessage attempt failed', { attempt: attempt + 1, status });
      if (attempt === delays.length - 1) {
        logger.error('Telegram notification failed after retries', { attempts: delays.length, status });
      }
    }
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
