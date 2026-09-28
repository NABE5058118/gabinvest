declare global {
  interface Window {
    Telegram?: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      WebApp: any;
    };
  }
}

export function initTelegram() {
  if (window.Telegram?.WebApp) {
    (window.Telegram.WebApp as { ready: () => void; expand: () => void }).ready();
    (window.Telegram.WebApp as { ready: () => void; expand: () => void }).expand();
  }
}

export function getInitData(): string {
  return window.Telegram?.WebApp?.initData || '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTelegramUser(): any {
  return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
}
