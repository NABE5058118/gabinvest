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
  monthlyRent?: number;
  annualRevenue?: number;
  leaseEndDate?: string;
  anchorTenantName?: string;
  priceIndicator?: string;
  description?: string;
  image?: string;
  moderation?: { status: string };
  placement?: { type: string; price?: number; isExclusive: boolean };
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
    monthlyRent: '',
    annualRevenue: '',
    leaseEndDate: '',
    anchorTenantName: '',
    priceIndicator: '',
    description: '',
  });
  const [moderationStatus, setModerationStatus] = useState('pending');
  const [placementType, setPlacementType] = useState('standard');
  const [placementPrice, setPlacementPrice] = useState('');
  const [isExclusive, setIsExclusive] = useState(false);
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
            monthlyRent: data.monthlyRent ? String(data.monthlyRent) : '',
            annualRevenue: data.annualRevenue ? String(data.annualRevenue) : '',
            leaseEndDate: data.leaseEndDate ? data.leaseEndDate.slice(0, 10) : '',
            anchorTenantName: data.anchorTenantName || '',
            priceIndicator: data.priceIndicator || '',
            description: data.description || '',
          });
          setExistingImage(data.image || null);
          if (data.moderation) setModerationStatus(data.moderation.status);
          if (data.placement) {
            setPlacementType(data.placement.type);
            setPlacementPrice(data.placement.price ? String(data.placement.price) : '');
            setIsExclusive(data.placement.isExclusive);
          }
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
      monthlyRent: form.monthlyRent ? Number(form.monthlyRent) : null,
      annualRevenue: form.annualRevenue ? Number(form.annualRevenue) : null,
      leaseEndDate: form.leaseEndDate ? new Date(form.leaseEndDate) : null,
      anchorTenantName: form.anchorTenantName || null,
      priceIndicator: form.priceIndicator || null,
      description: form.description || null,
      image: existingImage || null,
    };

    try {
      let data;
      if (id && id !== 'new') {
        const res = await adminApi.put(`/api/admin/objects/${id}`, payload);
        data = res.data;
        if (imageFile) {
          await uploadImage(data.id);
        }
      } else {
        const res = await adminApi.post('/api/admin/objects', payload);
        data = res.data;
        if (imageFile) {
          await uploadImage(data.id);
        }
      }

      if (moderationStatus) {
        await adminApi.patch(`/api/admin/objects/${data.id}/moderation`, {
          status: moderationStatus,
        });
      }

      await adminApi.patch(`/api/admin/objects/${data.id}/placement`, {
        type: placementType,
        price: placementPrice || null,
        isExclusive,
      });

      navigate(`/admin/objects/${data.id}`);
    } catch (err: any) {
      const backendMessage = err?.response?.data?.error;
      setError(backendMessage || 'Ошибка сохранения');
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
        {error && <div className={styles.error}>{error}</div>}

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
            max={2147483647}
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
          <label className={styles.label}>Арендный поток /мес, ₽</label>
          <input
            className={styles.input}
            type="number"
            value={form.monthlyRent}
            onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Годовая выручка, ₽</label>
          <input
            className={styles.input}
            type="number"
            value={form.annualRevenue}
            onChange={(e) => setForm({ ...form, annualRevenue: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Окончание договора аренды</label>
          <input
            className={styles.input}
            type="date"
            value={form.leaseEndDate}
            onChange={(e) => setForm({ ...form, leaseEndDate: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Якорный арендатор</label>
          <input
            className={styles.input}
            value={form.anchorTenantName}
            onChange={(e) => setForm({ ...form, anchorTenantName: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Индикация цены</label>
          <select
            className={styles.select}
            value={form.priceIndicator}
            onChange={(e) => setForm({ ...form, priceIndicator: e.target.value })}
          >
            <option value="">Не указано</option>
            <option value="below_market">Ниже рынка</option>
            <option value="market">По рынку</option>
            <option value="above_market">Выше рынка</option>
          </select>
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

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Размещение</h3>
          <div className={styles.field}>
            <label className={styles.label}>Тип размещения</label>
            <select
              className={styles.select}
              value={placementType}
              onChange={(e) => setPlacementType(e.target.value)}
            >
              <option value="standard">Стандартное (бесплатное)</option>
              <option value="paid">Платное (3 000 ₽)</option>
              <option value="exclusive">Эксклюзивное</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Цена размещения, ₽</label>
            <input
              className={styles.input}
              type="number"
              value={placementPrice}
              onChange={(e) => setPlacementPrice(e.target.value)}
            />
          </div>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={isExclusive}
              onChange={(e) => setIsExclusive(e.target.checked)}
            />
            <span>Эксклюзив</span>
          </label>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Модерация</h3>
          <div className={styles.field}>
            <label className={styles.label}>Статус</label>
            <select
              className={styles.select}
              value={moderationStatus}
              onChange={(e) => setModerationStatus(e.target.value)}
            >
              <option value="pending">На проверке</option>
              <option value="approved">Одобрено</option>
              <option value="rejected">Отклонено</option>
            </select>
          </div>
        </div>

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