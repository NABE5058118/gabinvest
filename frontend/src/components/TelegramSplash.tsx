import { useEffect, useState } from 'react';

type Status = 'loading' | 'ready' | 'error';

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

    if (tg.WebApp.readyState === 'loading') {
      const onReady = () => {
        setStatus('ready');
      };
      tg.WebApp.onEvent('readyStateChange', onReady);
      return () => {
        tg.WebApp.offEvent('readyStateChange', onReady);
      };
    }

    setStatus('ready');
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
