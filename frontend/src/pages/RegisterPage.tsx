import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '@utils/api';
import { useAuth } from '@context/AuthContext';
import { formatPhone } from '@utils/formatPhone';
import { Eye, EyeOff } from 'lucide-react';
import Header from '@components/Header';
import styles from '@styles/Auth.module.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const { login: authLogin } = useAuth();

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    let valid = true;

    if (!form.firstName.trim()) {
      next.firstName = 'Имя обязательно';
      valid = false;
    }
    if (!form.lastName.trim()) {
      next.lastName = 'Фамилия обязательна';
      valid = false;
    }
    if (!form.phone.trim()) {
      next.phone = 'Телефон обязателен';
      valid = false;
    }
    if (!form.email.trim()) {
      next.email = 'Email обязателен';
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Некорректный email';
      valid = false;
    }
    if (!form.password) {
      next.password = 'Пароль обязателен';
      valid = false;
    } else if (form.password.length < 8) {
      next.password = 'Пароль должен быть не менее 8 символов';
      valid = false;
    }
    if (form.password !== form.confirmPassword) {
      next.confirmPassword = 'Пароли не совпадают';
      valid = false;
    }

    setFieldError(next);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const res = await api.post('/api/auth/register', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      authLogin(res.data.user);
      navigate('/');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = (field: 'password' | 'confirmPassword') => {
    if (field === 'password') setPasswordVisible(!passwordVisible);
    else setConfirmPasswordVisible(!confirmPasswordVisible);
  };

  return (
    <div className={styles.page}>
      <Header onBack={() => navigate(-1)} title="Регистрация" />

      <div className={styles.form}>
        {error && <div className={styles.error} role="status" aria-live="polite">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="firstName">Имя</label>
            <input
              id="firstName"
              className={`${styles.input} ${fieldError.firstName ? styles.inputError : ''}`}
              type="text"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="Иван"
              required
            />
            {fieldError.firstName && <div className={styles.fieldError}>{fieldError.firstName}</div>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="lastName">Фамилия</label>
            <input
              id="lastName"
              className={`${styles.input} ${fieldError.lastName ? styles.inputError : ''}`}
              type="text"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Иванов"
              required
            />
            {fieldError.lastName && <div className={styles.fieldError}>{fieldError.lastName}</div>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="phone">Телефон</label>
            <div className={styles.inputWrapper}>
              <input
                id="phone"
                className={`${styles.input} ${fieldError.phone ? styles.inputError : ''}`}
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                placeholder="+7 (999) 999-99-99"
                required
              />
            </div>
            {fieldError.phone && <div className={styles.fieldError}>{fieldError.phone}</div>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              className={`${styles.input} ${fieldError.email ? styles.inputError : ''}`}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@example.com"
              required
            />
            {fieldError.email && <div className={styles.fieldError}>{fieldError.email}</div>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">Пароль</label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                className={`${styles.input} ${fieldError.password ? styles.inputError : ''}`}
                type={passwordVisible ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => togglePassword('password')}
                aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {passwordVisible ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
              </button>
            </div>
            {fieldError.password && <div className={styles.fieldError}>{fieldError.password}</div>}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPassword">Повторите пароль</label>
            <div className={styles.inputWrapper}>
              <input
                id="confirmPassword"
                className={`${styles.input} ${fieldError.confirmPassword ? styles.inputError : ''}`}
                type={confirmPasswordVisible ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => togglePassword('confirmPassword')}
                aria-label={confirmPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {confirmPasswordVisible ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
              </button>
            </div>
            {fieldError.confirmPassword && <div className={styles.fieldError}>{fieldError.confirmPassword}</div>}
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
