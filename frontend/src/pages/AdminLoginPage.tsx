import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@utils/adminApi';
import { Eye, EyeOff } from 'lucide-react';
import Header from '@components/Header';
import styles from '@styles/Auth.module.css';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data } = await adminApi.post('/api/admin/auth/login', { login, password });
      localStorage.setItem('adminUser', JSON.stringify(data.user));
      navigate('/admin/object', { replace: true });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Header onBack={() => navigate('/')} title="Вход в админ панель" />

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error} role="status" aria-live="polite">{error}</div>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="admin-login">Логин</label>
          <input
            id="admin-login"
            className={styles.input}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="admin-password">Пароль</label>
          <div className={styles.inputWrapper}>
            <input
              id="admin-password"
              className={styles.input}
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
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
