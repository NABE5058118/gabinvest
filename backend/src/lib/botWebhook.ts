import fs from 'fs';
import https from 'https';
import axios, { AxiosRequestConfig } from 'axios';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('bot-webhook');

export type BotWebhookKind = 'lead' | 'object' | 'status';

const BOT_WEBHOOK_URL = (process.env.BOT_WEBHOOK_URL || '').trim();
const BOT_WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET || '';
const ALLOW_HTTP =
  process.env.BOT_WEBHOOK_ALLOW_HTTP === '1' || process.env.NODE_ENV !== 'production';

const ENDPOINT_SUFFIX: Record<BotWebhookKind, string> = {
  lead: 'lead-notify',
  object: 'object-notify',
  status: 'notify-status',
};

function readOptionalFile(envName: string): Buffer | undefined {
  const file = process.env[envName];
  if (!file) return undefined;
  try {
    return fs.readFileSync(file);
  } catch (error) {
    logger.error(`Could not read ${envName} (${file}); TLS client configuration is incomplete`);
    throw error;
  }
}

export function getBotWebhookUrl(kind: BotWebhookKind): string | null {
  if (!BOT_WEBHOOK_URL) return null;
  // BOT_WEBHOOK_URL points at the lead-notify endpoint for backwards compatibility.
  return BOT_WEBHOOK_URL.replace(/lead-notify\/?$/, ENDPOINT_SUFFIX[kind]);
}

export function validateBotWebhookConfig(): string[] {
  const problems: string[] = [];
  if (!BOT_WEBHOOK_URL) return problems;

  let parsed: URL;
  try {
    parsed = new URL(BOT_WEBHOOK_URL);
  } catch {
    return ['BOT_WEBHOOK_URL must be a valid absolute URL'];
  }

  if (parsed.protocol !== 'https:' && !ALLOW_HTTP) {
    problems.push(
      'BOT_WEBHOOK_URL must use https:// in production (set BOT_WEBHOOK_ALLOW_HTTP=1 only for local development)',
    );
  }
  if (!BOT_WEBHOOK_SECRET) {
    problems.push('BOT_WEBHOOK_SECRET is required when BOT_WEBHOOK_URL is set');
  }

  const cert = process.env.BOT_WEBHOOK_CLIENT_CERT_FILE;
  const key = process.env.BOT_WEBHOOK_CLIENT_KEY_FILE;
  if (Boolean(cert) !== Boolean(key)) {
    problems.push('BOT_WEBHOOK_CLIENT_CERT_FILE and BOT_WEBHOOK_CLIENT_KEY_FILE must be set together');
  }

  return problems;
}

function httpsAgent(): https.Agent | undefined {
  const ca = readOptionalFile('BOT_WEBHOOK_CA_FILE');
  const cert = readOptionalFile('BOT_WEBHOOK_CLIENT_CERT_FILE');
  const key = readOptionalFile('BOT_WEBHOOK_CLIENT_KEY_FILE');
  if (!ca && !cert && !key) return undefined;
  return new https.Agent({ ca, cert, key, rejectUnauthorized: true, minVersion: 'TLSv1.2' });
}

export async function sendBotWebhook(
  kind: BotWebhookKind,
  payload: unknown,
  timeout: number,
): Promise<number | null> {
  const url = getBotWebhookUrl(kind);
  if (!url) return null;
  if (!BOT_WEBHOOK_SECRET) {
    logger.warn('Bot webhook skipped: BOT_WEBHOOK_SECRET is not configured');
    return null;
  }

  const config: AxiosRequestConfig = {
    headers: {
      'Content-Type': 'application/json',
      'x-bot-webhook-secret': BOT_WEBHOOK_SECRET,
    },
    timeout,
  };
  const agent = httpsAgent();
  if (agent) config.httpsAgent = agent;

  const response = await axios.post(url, payload, config);
  return response.status;
}
