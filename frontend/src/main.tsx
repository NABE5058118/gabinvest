import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { initTelegram } from './utils/telegram';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);

if (typeof window !== 'undefined' && !window.Telegram?.WebApp) {
  const script = document.createElement('script');
  script.src = 'https://telegram.org/js/telegram-web-app.js';
  script.async = true;
  script.onload = () => {
    initTelegram();
  };
  script.onerror = () => {
    // ignore - not in Telegram
  };
  document.head.appendChild(script);
} else if (typeof window !== 'undefined') {
  initTelegram();
}
