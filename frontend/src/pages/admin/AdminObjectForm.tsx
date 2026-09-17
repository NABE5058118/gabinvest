import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { adminApi } from '../../utils/adminApi';
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
  image?: string;
};

const RUSSIAN_CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Новосибирск',
  'Екатеринбург',
  'Казань',
  'Нижний Новгород',
  'Челябинск',
  'Самара',
  'Омск',
  'Ростов-на-Дону',
  'Уфа',
  'Красноярск',
  'Пермь',
  'Воронеж',
  'Волгоград',
];

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImage, setExistingImage] = useState<string | null>(null);

  useEffect(() => {
    if (id && id !== 'new') {
      adminApi.get(`/api/admin/objects/${id}`)
        .then((r) => r.data)
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
          setExistingImage(data.image || null);
        })
        .catch(() => setError('Ошибка загрузки'));
    }
  }, [id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (objectId: string): Promise<void> => {
    if (!imageFile) return;
    const formData = new FormData();
    formData.append('image', imageFile);
    await adminApi.post(`/api/admin/objects/${objectId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const deleteImage = async (objectId: string): Promise<void> => {
    await adminApi.delete(`/api/admin/objects/${objectId}/image`);
  };

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
      image: existingImage || imagePreview || null,
    };

    try {
      if (id && id !== 'new') {
        const { data } = await adminApi.put(`/api/admin/objects/${id}`, payload);
        if (imageFile) {
          await uploadImage(data.id);
        }
        navigate(`/admin/objects/${data.id}`);
      } else {
        const { data } = await adminApi.post('/api/admin/objects', payload);
        if (imageFile) {
          await uploadImage(data.id);
        }
        navigate(`/admin/objects/${data.id}`);
      }
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
          <select
            className={styles.select}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          >
            <option value="">Не указано</option>
            {RUSSIAN_CITIES.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
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

        <div className={styles.field}>
          <label className={styles.label}>Фото объекта</label>
          <input
            className={styles.input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={handleImageChange}
          />
          {(imagePreview || existingImage) && (
            <div className={styles.imagePreview}>
              <img
                src={imagePreview || existingImage || ''}
                alt="Preview"
                className={styles.previewImg}
              />
              <button
                type="button"
                className={styles.removeImageBtn}
                onClick={async () => {
                  if (existingImage && id && id !== 'new') {
                    await deleteImage(id);
                  }
                  setImageFile(null);
                  setImagePreview(null);
                  setExistingImage(null);
                }}
              >
                Удалить фото
              </button>
            </div>
          )}
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}
