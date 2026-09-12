import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockObjects } from '../utils/mockData';
import { ArrowLeft } from 'lucide-react';
import styles from './LeadFormPage.module.css';

export default function LeadFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const object = mockObjects.find((o) => o.id === id);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    comment: '',
  });
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    navigate('/lead-success');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <div>
          <h1 className={styles.headerTitle}>Оставить заявку</h1>
          {object && <div className={styles.objectTitle}>{object.title}</div>}
        </div>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label}>Ваше имя</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Иван Иванов"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Телефон</label>
          <input
            className={styles.input}
            type="tel"
            placeholder="+7 (___) ___-__-__"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Комментарий к заявке</label>
          <textarea
            className={styles.textarea}
            placeholder="Интересует дополнительная информация"
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            rows={4}
          />
        </div>

        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
          />
          <span>Согласен на обработку персональных данных</span>
        </label>

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!agreed}
        >
          Отправить заявку
        </button>

        <button
          type="button"
          className={styles.cancelBtn}
          onClick={() => navigate(-1)}
        >
          Отмена
        </button>
      </form>
    </div>
  );
}
