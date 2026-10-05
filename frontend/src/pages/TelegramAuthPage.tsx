import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Smartphone, CheckCircle } from 'lucide-react';
import { api } from '@utils/api';
import { useAuth } from '@context/AuthContext';
import { formatPhone } from '@utils/formatPhone';
import styles from '@styles/Auth.module.css';

export default function TelegramAuthPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (!tgUser?.id) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) {
        throw new Error('initData отсутствует');
      }

      const res = await api.post('/api/auth/telegram', { initData });
      authLogin(res.data.user, res.data.token);

      await api.put('/api/auth/profile', { phone });

      setSuccess(true);
      setTimeout(() => navigate('/', { replace: true }), 800);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.success}>
          <CheckCircle size={48} strokeWidth={2} color="#16a34a" />
          <h1>Готово</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Телефон</h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error} role="status" aria-live="polite">{error}</div>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="phone">
            <Smartphone size={16} strokeWidth={2} />
            Номер телефона
          </label>
          <input
            id="phone"
            className={styles.input}
            type="tel"
            placeholder="+7 (999) 123-45-67"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            required
            autoFocus
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}
