import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '@utils/api';
import { useAuth } from '@context/AuthContext';
import { formatPhone } from '@utils/formatPhone';
import { isTelegramWebApp } from '@utils/telegram';
import styles from '@styles/Auth.module.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    phone: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
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
      const res = await api.post('/api/auth/register', form);
      authLogin(res.data.user, res.data.token);
      navigate('/');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Ошибка регистрации');
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
        <h1 className={styles.title}>Регистрация</h1>
      </header>

      <div className={styles.form}>
        {error && <div className={styles.error} role="status" aria-live="polite">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="phone">Телефон</label>
            <input
              id="phone"
              className={styles.input}
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              className={styles.input}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Пароль</label>
            <input
              id="password"
              className={styles.input}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="firstName">Имя</label>
            <input
              id="firstName"
              className={styles.input}
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="lastName">Фамилия</label>
            <input
              id="lastName"
              className={styles.input}
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className={styles.footer}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
}
