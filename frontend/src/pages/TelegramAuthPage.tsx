import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, CheckCircle, MessageCircle } from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import styles from './Auth.module.css';

type Step = 'checking' | 'phone' | 'success' | 'error';

export default function TelegramAuthPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [step, setStep] = useState<Step>('checking');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [telegramUser, setTelegramUser] = useState<any>(null);

  useEffect(() => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser?.id) {
      setTelegramUser(tgUser);
      setStep('phone');
    } else {
      setError('Откройте приложение через Telegram');
      setStep('error');
    }
  }, []);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) {
        throw new Error('initData отсутствует. Откройте страницу через Telegram.');
      }

      const res = await api.post('/api/auth/telegram', {
        initData,
      });
      authLogin(res.data.user, res.data.token);

      if (!res.data.user.phone) {
        const updateRes = await api.put('/api/auth/profile', {
          phone,
        });
        authLogin(updateRes.data, res.data.token);
      }

      setStep('success');
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'checking') {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className={styles.page}>
        <div className={styles.success}>
          <CheckCircle size={48} strokeWidth={2} color="#16a34a" />
          <p>Авторизация успешна!</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={24} strokeWidth={2} />
          </button>
          <h1 className={styles.title}>Вход через Telegram</h1>
        </header>

        <div className={styles.form}>
          <div className={styles.errorBox}>
            <MessageCircle size={48} strokeWidth={1.5} color="#999" />
            <p>{error}</p>
            <p className={styles.errorHint}>
              Чтобы войти через Telegram, откройте эту страницу внутри Telegram-приложения.
            </p>
          </div>

          <button className={styles.telegramBtn} onClick={() => navigate('/login')}>
            Войти другим способом
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Регистрация</h1>
      </header>

      <div className={styles.form}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.telegramInfo}>
          <div className={styles.telegramAvatar}>
            {telegramUser?.first_name?.[0] || '?'}
          </div>
          <div className={styles.telegramName}>
            {telegramUser?.first_name} {telegramUser?.last_name}
          </div>
          {telegramUser?.username && (
            <div className={styles.telegramUsername}>@{telegramUser.username}</div>
          )}
        </div>

        <form onSubmit={handlePhoneSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>
              <Smartphone size={16} strokeWidth={2} />
              Номер телефона
            </label>
            <input
              className={styles.input}
              type="tel"
              placeholder="+7 (999) 123-45-67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Регистрация...' : 'Продолжить'}
          </button>
        </form>
      </div>
    </div>
  );
}