declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

export function initTelegram() {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
  }
}

export function getInitData(): string {
  return window.Telegram?.WebApp?.initData || '';
}

export function getTelegramUser(): any {
  return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
}
