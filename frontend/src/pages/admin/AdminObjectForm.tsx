import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { API_URL } from '../../utils/api';
import styles from './AdminObjectForm.module.css';

type ObjectItem = {
  id: string;
  title: string;
  type: string;
  price: number;
  yieldPercent: number;
  location: string;
  city?: string;
  area: number;
  roi?: number;
  description?: string;
};

const ADMIN_TOKEN = 'change-me-in-production';

export default function AdminObjectForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    type: 'Офис',
    price: '',
    yieldPercent: '',
    location: '',
    city: '',
    area: '',
    roi: '',
    description: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      fetch(`${API_URL}/api/admin/objects/${id}`, {
        headers: { 'x-admin-token': ADMIN_TOKEN },
      })
        .then((r) => r.json())
        .then((data: ObjectItem) => {
          setForm({
            title: data.title,
            type: data.type,
            price: String(data.price),
            yieldPercent: String(data.yieldPercent),
            location: data.location,
            city: data.city || '',
            area: String(data.area),
            roi: data.roi ? String(data.roi) : '',
            description: data.description || '',
          });
        })
        .catch(() => setError('Ошибка загрузки'));
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      title: form.title,
      type: form.type,
      price: Number(form.price),
      yieldPercent: Number(form.yieldPercent),
      location: form.location,
      city: form.city || null,
      area: Number(form.area),
      roi: form.roi ? Number(form.roi) : null,
      description: form.description || null,
    };

    try {
      const url =
        id && id !== 'new'
          ? `${API_URL}/api/admin/objects/${id}`
          : `${API_URL}/api/admin/objects`;
      const method = id && id !== 'new' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': ADMIN_TOKEN,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed');

      const obj = await res.json();
      navigate(`/admin/objects/${obj.id}`);
    } catch (err) {
      setError('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/admin')}>
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>
          {id && id !== 'new' ? 'Редактировать объект' : 'Новый объект'}
        </h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label}>Название</label>
          <input
            className={styles.input}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Тип</label>
          <select
            className={styles.select}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="Офис">Офис</option>
            <option value="Склад">Склад</option>
            <option value="Торговое помещение">Торговое помещение</option>
            <option value="Другое">Другое</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Цена, ₽</label>
          <input
            className={styles.input}
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Доходность, %</label>
          <input
            className={styles.input}
            type="number"
            value={form.yieldPercent}
            onChange={(e) => setForm({ ...form, yieldPercent: e.target.value })}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Локация</label>
          <input
            className={styles.input}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Город</label>
          <input
            className={styles.input}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Площадь, м²</label>
          <input
            className={styles.input}
            type="number"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>ROI, %</label>
          <input
            className={styles.input}
            type="number"
            value={form.roi}
            onChange={(e) => setForm({ ...form, roi: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Описание</label>
          <textarea
            className={styles.textarea}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}
