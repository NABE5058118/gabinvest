import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { api } from '@utils/api';
import Header from '@components/Header';
import { Copy, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';
import styles from '@styles/LinkTelegramPage.module.css';

export default function LinkTelegramPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isLinked = Boolean(user?.telegramId);

  useEffect(() => {
    if (isLinked) return;

    let cancelled = false;
    const loadExistingCode = async () => {
      try {
        const res = await api.post('/api/auth/link-code/generate');
        if (!cancelled) {
          setCode(res.data.code);
          setSuccess(true);
        }
      } catch {
        // silently ignore: no code yet or server error, user can press "Получить код"
      }
    };

    loadExistingCode();
    return () => {
      cancelled = true;
    };
  }, [isLinked]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    setCode(null);

    try {
      const res = await api.post('/api/auth/link-code/generate');
      setCode(res.data.code);
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } }).response?.data
          ?.error || 'Не удалось получить код';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
  };

  const handleBack = () => {
    navigate('/profile');
  };

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
            <p className={styles.codeHint}>
              Отправьте боту команду:<br />
              <span className={styles.codeCommand}>/link {code}</span>
            </p>
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
              привяжите свой Telegram. Код будет действителен 15 минут.
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
