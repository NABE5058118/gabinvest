import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '@utils/api';
import { useAuth } from '@context/AuthContext';
import { isTelegramWebApp } from '@utils/telegram';
import styles from '@styles/Auth.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login: authLogin } = useAuth();

  useEffect(() => {
    if (isTelegramWebApp()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/api/auth/login', { login, password });
      authLogin(res.data.user, res.data.token);
      if (res.data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 429) {
        setError('Слишком много попыток. Подождите 15 минут.');
      } else {
        setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Ошибка входа');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Вход</h1>
      </header>

      <div className={styles.form}>
        {error && <div className={styles.error} role="status" aria-live="polite">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login">Телефон или email</label>
            <input
              id="login"
              className={styles.input}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Пароль</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className={styles.footer}>
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  );
}
