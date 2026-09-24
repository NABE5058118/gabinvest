import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { initTelegram } from './utils/telegram';
import TelegramSplash from './components/TelegramSplash';

const loadTelegram = () =>
  new Promise<void>((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    if (window.Telegram?.WebApp) {
      console.log('[Telegram] already present');
      resolve();
      return;
    }

    console.log('[Telegram] loading script');
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-web-app.js';
    script.async = true;
    script.onload = () => {
      console.log('[Telegram] script loaded', !!window.Telegram?.WebApp);
      resolve();
    };
    script.onerror = () => {
      console.warn('[Telegram] script failed to load');
      resolve();
    };
    document.head.appendChild(script);
  });

loadTelegram().then(() => {
  initTelegram();
  console.log('[Telegram] after init', !!window.Telegram?.WebApp, !!window.Telegram?.WebApp?.initData, !!window.Telegram?.WebApp?.initDataUnsafe?.user);

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <TelegramSplash>
      <App />
    </TelegramSplash>
  );
});
