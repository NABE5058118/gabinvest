import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { api } from '@utils/api';
import Header from '@components/Header';
import { Copy, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';
import styles from '@styles/LinkTelegramPage.module.css';

export default function LinkTelegramPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(() => {
    const stored = localStorage.getItem('link_code_value');
    return stored || null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(() => {
    const stored = localStorage.getItem('link_code_value');
    const expiresAt = localStorage.getItem('link_code_expires_at');
    return Boolean(stored && expiresAt && Number(expiresAt) > Date.now());
  });
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const stored = localStorage.getItem('link_code_expires_at');
    if (!stored) return 0;
    return Math.max(0, Math.floor((Number(stored) - Date.now()) / 1000));
  });

  const isLinked = Boolean(user?.telegramId);

  const CODE_STORAGE_KEY = 'link_code_expires_at';
  const CODE_STORAGE_CODE = 'link_code_value';

  const getRemainingSeconds = useCallback((expiresAt: number) => Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)), []);

  const startTimer = useCallback((expiresAt: number) => {
    const interval = setInterval(() => {
      setSecondsLeft(getRemainingSeconds(expiresAt));
    }, 1000);
    return interval;
  }, [getRemainingSeconds]);

  useEffect(() => {
    if (isLinked) {
      localStorage.removeItem(CODE_STORAGE_KEY);
      localStorage.removeItem(CODE_STORAGE_CODE);
      return;
    }

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const storedCode = localStorage.getItem(CODE_STORAGE_CODE);
    const storedExpiresAt = localStorage.getItem(CODE_STORAGE_KEY);

    if (storedCode && storedExpiresAt) {
      const expiresAt = Number(storedExpiresAt);
      const remaining = getRemainingSeconds(expiresAt);
      if (remaining > 0 && !cancelled) {
        interval = startTimer(expiresAt);
      } else {
        localStorage.removeItem(CODE_STORAGE_KEY);
        localStorage.removeItem(CODE_STORAGE_CODE);
      }
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [isLinked, startTimer, getRemainingSeconds]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setCode(null);
    setSecondsLeft(0);
    localStorage.removeItem(CODE_STORAGE_KEY);
    localStorage.removeItem(CODE_STORAGE_CODE);

    try {
      const res = await api.post('/api/auth/link-code/generate');
      const fetchedCode = res.data.code;
      const expiresInMinutes = res.data.expiresInMinutes ?? 5;
      const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
      localStorage.setItem(CODE_STORAGE_KEY, String(expiresAt));
      localStorage.setItem(CODE_STORAGE_CODE, fetchedCode);
      setCode(fetchedCode);
      setSuccess(true);
      setSecondsLeft(getRemainingSeconds(expiresAt));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 429) {
        setError('Слишком частые запросы. Подождите немного перед повторной генерацией кода.');
      } else {
        setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Не удалось получить код');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(`/link ${code}`);
  };

  const handleBack = () => {
    navigate('/profile');
  };

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const timerText = `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  const expired = secondsLeft === 0 && code !== null;

  if (isLinked) {
    return (
      <div className={styles.page}>
        <Header onBack={handleBack} title="Привязка Telegram" />

        <div className={styles.content}>
          <div className={styles.card}>
            <div className={styles.iconWrapper}>
              <CheckCircle2 size={48} strokeWidth={2} color="#16a34a" />
            </div>
            <h1 className={styles.title}>Telegram уже привязан</h1>
            <p className={styles.description}>
              Ваш Telegram-аккаунт уже привязан к этому профилю.
            </p>
            <button className={styles.backBtn} onClick={handleBack}>
              Назад в профиль
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header onBack={handleBack} title="Привязка Telegram" />

      <div className={styles.content}>
        {error && (
          <div className={styles.errorAlert}>
            <AlertCircle size={20} strokeWidth={2} color="#b42318" />
            <span>{error}</span>
          </div>
        )}

        {success && code && (
          <div className={styles.codeCard}>
            <div className={styles.codeHeader}>
              <h2 className={styles.codeTitle}>Ваш код привязки</h2>
              <button className={styles.copyBtn} onClick={handleCopy} title="Скопировать">
                <Copy size={18} strokeWidth={2} />
              </button>
            </div>
            <div className={styles.codeValue}>{code}</div>
            {expired ? (
              <p className={styles.timerExpired}>Код истёк. Запросите новый.</p>
            ) : (
              <p className={styles.timer}>Истекает через {timerText}</p>
            )}
            <p className={styles.codeSteps}>
              1. Откройте бота в Telegram<br />
              2. Напишите /link и ваш код<br />
              3. Аккаунты будут привязаны
            </p>
          </div>
        )}

        {!success && (
          <div className={styles.generateCard}>
            <h2 className={styles.generateTitle}>Привязать Telegram к профилю</h2>
            <p className={styles.generateDescription}>
              Чтобы входить на сайт и в Mini App под одним аккаунтом,
              привяжите свой Telegram. Код будет действителен 5 минут.
            </p>
            <div className={styles.telegramInfo}>
              <Smartphone size={20} strokeWidth={2} color="#0088cc" />
              <span>Телефон из профиля Telegram не требуется</span>
            </div>
            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? 'Генерируем...' : 'Получить код'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
