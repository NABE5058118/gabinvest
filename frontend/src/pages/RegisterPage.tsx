import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';
import styles from './Auth.module.css';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/api/auth/register', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Регистрация</h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.label}>Телефон</label>
          <input
            className={styles.input}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Пароль</label>
          <input
            className={styles.input}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Имя</label>
          <input
            className={styles.input}
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Фамилия</label>
          <input
            className={styles.input}
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>

        <p className={styles.footer}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </div>
  );
}
