import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { api } from '@utils/api';
import { formatPhone } from '@utils/formatPhone';
import styles from '@styles/ProfileEditPage.module.css';

export default function ProfileEditPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone ? formatPhone(user.phone) : '',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) {
      setError('Имя обязательно');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await api.put('/api/auth/profile', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      updateUser(res.data);
      setSuccess(true);
      setTimeout(() => navigate('/profile'), 1000);
    } catch {
      setError('Не удалось обновить профиль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Редактировать профиль</h1>
      </header>

      <div className={styles.content}>
        {error && <div className={styles.error} role="status" aria-live="polite">{error}</div>}
        {success && <div className={styles.success} role="status" aria-live="polite">Профиль обновлён</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="firstName">Имя</label>
            <input
              id="firstName"
              className={styles.input}
              type="text"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="Имя"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="lastName">Фамилия</label>
            <input
              id="lastName"
              className={styles.input}
              type="text"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Фамилия"
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
              placeholder="email@example.com"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="phone">Телефон</label>
            <input
              id="phone"
              className={styles.input}
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
              placeholder="+7 (999) 999-99-99"
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </div>
    </main>
  );
}
