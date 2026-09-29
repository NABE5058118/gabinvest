import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ObjectType } from '@utils/types';
import { api } from '@utils/api';
import { getLeadClientId } from '@utils/types';
import styles from '@styles/LeadFormPage.module.css';

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '').replace(/^[78]/, '').slice(0, 10);

  if (!numbers) return '+7';

  const p1 = numbers.slice(0, 3);
  const p2 = numbers.slice(3, 6);
  const p3 = numbers.slice(6, 8);
  const p4 = numbers.slice(8, 10);

  let result = '+7';
  if (p1) result += ` (${p1}`;
  if (p1.length === 3) result += ')';
  if (p2) result += ` ${p2}`;
  if (p3) result += `-${p3}`;
  if (p4) result += `-${p4}`;

  return result;
};

export default function LeadFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const phoneCursorRef = useRef<number | null>(null);
  const [object, setObject] = useState<ObjectType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '+7',
    comment: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const cursorPosition = input.selectionStart || 0;
    const digitsBeforeCursor = input.value.slice(0, cursorPosition).replace(/\D/g, '').length;

    const formatted = formatPhone(e.target.value);
    setForm((prev) => ({ ...prev, phone: formatted }));

    let digitsSeen = 0;
    let nextPosition = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        digitsSeen++;
        if (digitsSeen === digitsBeforeCursor) {
          nextPosition = i + 1;
          break;
        }
      }
    }

    nextPosition = Math.min(nextPosition, formatted.length);
    phoneCursorRef.current = nextPosition;
  };

  useEffect(() => {
    if (phoneCursorRef.current !== null && phoneInputRef.current) {
      phoneInputRef.current.setSelectionRange(phoneCursorRef.current, phoneCursorRef.current);
      phoneCursorRef.current = null;
    }
  }, [form.phone]);

  useEffect(() => {
    if (!id) return;
    api
      .get<ObjectType>(`/api/objects/${id}`)
      .then((res) => setObject(res.data))
      .catch(() => setError('Объект не найден'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Загрузка...</div>
      </div>
    );
  }

  if (error || !object) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error || 'Объект не найден'}</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed || !id) return;

    setSubmitError(null);

    try {
      await api.post('/api/leads', {
        objectId: id,
        name: form.name,
        phone: form.phone,
        comment: form.comment,
        consent: agreed,
        clientId: getLeadClientId(),
      });
      setSubmitted(true);
      setTimeout(() => navigate('/lead-success'), 800);
    } catch {
      setSubmitError('Не удалось отправить заявку. Попробуйте ещё раз.');
    }
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
            ref={phoneInputRef}
            className={styles.input}
            type="tel"
            placeholder="+7 (___) ___-__-__"
            value={form.phone}
            onChange={handlePhoneChange}
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

        {submitError && <div className={styles.error}>{submitError}</div>}
        {submitted && <div className={styles.success}>Заявка отправлена!</div>}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!agreed || submitted}
        >
          {submitted ? 'Отправлено' : 'Отправить заявку'}
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
