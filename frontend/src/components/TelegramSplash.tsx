import { useEffect, useState } from 'react';

type Status = 'loading' | 'ready';

export default function TelegramSplash({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (typeof window === 'undefined') {
      setStatus('ready');
      return;
    }

    const tg = window.Telegram;
    if (!tg?.WebApp) {
      setStatus('ready');
      return;
    }

    const webApp = tg.WebApp;

    if (webApp.readyState === 'ready') {
      setStatus('ready');
      return;
    }

    const onReady = () => {
      setStatus('ready');
    };

    webApp.onEvent('ready', onReady);

    return () => {
      webApp.offEvent('ready', onReady);
    };
  }, []);

  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        color: '#000',
        fontSize: 14,
      }}>
        Загрузка...
      </div>
    );
  }

  return <>{children}</>;
}
