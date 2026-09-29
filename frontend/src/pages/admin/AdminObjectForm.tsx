import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { adminApi } from '@utils/adminApi';
import { CITIES } from '../../data/cities';
import styles from '@styles/AdminObjectForm.module.css';

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
  images?: Array<{ id: string; url: string; sort: number }>;
  moderation?: { status: string };
  placement?: { type: string; price?: number; isExclusive: boolean };
};

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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<Array<{ id: string; url: string }>>([]);

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
          setExistingImages((data.images || []).map((img) => ({ id: img.id, url: img.url })));
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
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const uploadImages = async (objectId: string): Promise<void> => {
    if (!imageFiles.length) return;
    const formData = new FormData();
    imageFiles.forEach((file) => formData.append('images', file));
    await adminApi.post(`/api/admin/objects/${objectId}/images/bulk`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const deleteImage = async (objectId: string, imageId: string): Promise<void> => {
    await adminApi.delete(`/api/admin/objects/${objectId}/images/${imageId}`);
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
      image: existingImages[0]?.url || null,
    };

    try {
      let data;
      if (id && id !== 'new') {
        const res = await adminApi.put(`/api/admin/objects/${id}`, payload);
        data = res.data;
        if (imageFiles.length) {
          await uploadImages(data.id);
        }
      } else {
        const res = await adminApi.post('/api/admin/objects', payload);
        data = res.data;
        if (imageFiles.length) {
          await uploadImages(data.id);
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
    } catch (err: unknown) {
      const backendMessage = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
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
            {CITIES.map((city) => (
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
            multiple
            onChange={handleImageChange}
          />
          <div className={styles.imagePreviewGrid}>
            {existingImages.map((img) => (
              <div key={img.id} className={styles.imagePreviewItem}>
                <img src={img.url} alt="" className={styles.previewImg} />
                <button
                  type="button"
                  className={styles.removeImageBtn}
                  onClick={async () => {
                    if (id && id !== 'new') {
                      await deleteImage(id, img.id);
                    }
                    setExistingImages((prev) => prev.filter((i) => i.id !== img.id));
                  }}
                >
                  Удалить
                </button>
              </div>
            ))}
            {imagePreviews.map((url, idx) => (
              <div key={idx} className={styles.imagePreviewItem}>
                <img src={url} alt="" className={styles.previewImg} />
                <button
                  type="button"
                  className={styles.removeImageBtn}
                  onClick={() => {
                    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
                    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
                  }}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}
