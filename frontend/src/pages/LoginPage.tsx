import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@utils/api';
import { useAuth } from '@context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import Header from '@components/Header';
import styles from '@styles/Auth.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { login: authLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/api/auth/login', { login, password });
      authLogin(res.data.user);
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
      <Header onBack={() => navigate(-1)} title="Вход" />

      <div className={styles.form}>
        {error && <div className={styles.error} role="status" aria-live="polite">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login">Телефон или email</label>
            <input
              id="login"
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
            />
            {error && <div className={styles.fieldError}>{error}</div>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Пароль</label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                type={passwordVisible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setPasswordVisible(!passwordVisible)}
                aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {passwordVisible ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
              </button>
            </div>
            {error && <div className={styles.fieldError}>{error}</div>}
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
