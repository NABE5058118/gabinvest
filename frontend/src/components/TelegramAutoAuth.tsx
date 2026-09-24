import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

type Status = 'idle' | 'loading' | 'done' | 'error';

export default function TelegramAutoAuth() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.Telegram?.WebApp) return;
    if (localStorage.getItem('token')) return;

    const tgUser = window.Telegram.WebApp.initDataUnsafe?.user;
    if (!tgUser?.id) return;

    let cancelled = false;
    setStatus('loading');

    api
      .post('/api/auth/telegram', {
        initData: window.Telegram.WebApp.initData || '',
      })
      .then((res) => {
        if (cancelled) return;
        const user = res.data.user;
        authLogin(user, res.data.token);
        setStatus('done');
        if (user.phone) {
          navigate('/', { replace: true });
        } else {
          navigate('/telegram-auth', { replace: true });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus('error');
          console.error('Telegram auto auth failed', err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLogin, navigate]);

  if (status === 'loading') {
    return null;
  }

  if (status === 'error') {
    return null;
  }

  return null;
}
