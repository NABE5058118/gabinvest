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
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<Array<{ id: string; url: string }>>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSuccess(null);
    setError(null);
    setFieldErrors({});
    setToast(null);
  }, [form.title, form.type, form.price, form.yieldPercent, form.location, form.area]);

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
      setExistingImages((data.images || []).map((img: { id: string; url: string }) => ({ id: img.id, url: img.url })));
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

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Укажите название';
    if (!form.type) errors.type = 'Укажите тип';
    if (form.price === '' || Number(form.price) <= 0) errors.price = 'Укажите корректную цену';
    if (form.yieldPercent === '' || Number(form.yieldPercent) < 0) errors.yieldPercent = 'Укажите доходность';
    if (!form.location.trim()) errors.location = 'Укажите локацию';
    if (form.area === '' || Number(form.area) <= 0) errors.area = 'Укажите площадь';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const refreshForm = async (objectId: string): Promise<void> => {
    const { data } = await adminApi.get<ObjectItem>(`/api/admin/objects/${objectId}`);
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
    setImageFiles([]);
    setImagePreviews([]);
    if (data.moderation) setModerationStatus(data.moderation.status);
    if (data.placement) {
      setPlacementType(data.placement.type);
      setPlacementPrice(data.placement.price ? String(data.placement.price) : '');
      setIsExclusive(data.placement.isExclusive);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setToast(null);

    if (!validate()) {
      setLoading(false);
      return;
    }

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

      const patches = [
        adminApi.patch(`/api/admin/objects/${data.id}/placement`, {
          type: placementType,
          price: placementPrice || null,
          isExclusive,
        }),
      ];
      if (moderationStatus) {
        patches.push(
          adminApi.patch(`/api/admin/objects/${data.id}/moderation`, {
            status: moderationStatus,
          })
        );
      }
      await Promise.all(patches);

      setSuccess('Сохранено');
      setFieldErrors({});
      window.dispatchEvent(new Event('objects:refresh'));
      setToast({ type: 'success', message: 'Сохранено' });

      await refreshForm(data.id);

      setTimeout(() => {
        navigate('/admin');
      }, 1000);
    } catch (err: unknown) {
      const backendMessage = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      const message = backendMessage || 'Ошибка сохранения';
      setError(message);
      setToast({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/admin')} aria-label="Назад">
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>
          {id && id !== 'new' ? 'Редактировать объект' : 'Новый объект'}
        </h1>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.error} role="status" aria-live="polite">{error}</div>}

        {toast && (
          <div className={toast.type === 'success' ? styles.toastSuccess : styles.toastError} role="status" aria-live="polite">
            {toast.message}
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="title">Название</label>
          <input
            id="title"
            className={styles.input}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            aria-invalid={!!fieldErrors.title}
            aria-describedby={fieldErrors.title ? 'field-error-title' : undefined}
          />
          {fieldErrors.title && <div id="field-error-title" className={styles.fieldError}>{fieldErrors.title}</div>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="type">Тип</label>
          <select
            id="type"
            className={styles.select}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            aria-invalid={!!fieldErrors.type}
            aria-describedby={fieldErrors.type ? 'field-error-type' : undefined}
          >
            <option value="Офис">Офис</option>
            <option value="Склад">Склад</option>
            <option value="Торговое помещение">Торговое помещение</option>
            <option value="Другое">Другое</option>
          </select>
          {fieldErrors.type && <div id="field-error-type" className={styles.fieldError}>{fieldErrors.type}</div>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="price">Цена, ₽</label>
          <input
            id="price"
            className={styles.input}
            type="number"
            max={2147483647}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
            aria-invalid={!!fieldErrors.price}
            aria-describedby={fieldErrors.price ? 'field-error-price' : undefined}
          />
          {fieldErrors.price && <div id="field-error-price" className={styles.fieldError}>{fieldErrors.price}</div>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="yieldPercent">Доходность, %</label>
          <input
            id="yieldPercent"
            className={styles.input}
            type="number"
            value={form.yieldPercent}
            onChange={(e) => setForm({ ...form, yieldPercent: e.target.value })}
            required
            aria-invalid={!!fieldErrors.yieldPercent}
            aria-describedby={fieldErrors.yieldPercent ? 'field-error-yieldPercent' : undefined}
          />
          {fieldErrors.yieldPercent && <div id="field-error-yieldPercent" className={styles.fieldError}>{fieldErrors.yieldPercent}</div>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="location">Локация</label>
          <input
            id="location"
            className={styles.input}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            required
            aria-invalid={!!fieldErrors.location}
            aria-describedby={fieldErrors.location ? 'field-error-location' : undefined}
          />
          {fieldErrors.location && <div id="field-error-location" className={styles.fieldError}>{fieldErrors.location}</div>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="city">Город</label>
          <select
            id="city"
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
          <label className={styles.label} htmlFor="area">Площадь, м²</label>
          <input
            id="area"
            className={styles.input}
            type="number"
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            required
            aria-invalid={!!fieldErrors.area}
            aria-describedby={fieldErrors.area ? 'field-error-area' : undefined}
          />
          {fieldErrors.area && <div id="field-error-area" className={styles.fieldError}>{fieldErrors.area}</div>}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="monthlyRent">Арендный поток /мес, ₽</label>
          <input
            id="monthlyRent"
            className={styles.input}
            type="number"
            value={form.monthlyRent}
            onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="annualRevenue">Годовая выручка, ₽</label>
          <input
            id="annualRevenue"
            className={styles.input}
            type="number"
            value={form.annualRevenue}
            onChange={(e) => setForm({ ...form, annualRevenue: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="leaseEndDate">Окончание договора аренды</label>
          <input
            id="leaseEndDate"
            className={styles.input}
            type="date"
            value={form.leaseEndDate}
            onChange={(e) => setForm({ ...form, leaseEndDate: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="anchorTenantName">Якорный арендатор</label>
          <input
            id="anchorTenantName"
            className={styles.input}
            value={form.anchorTenantName}
            onChange={(e) => setForm({ ...form, anchorTenantName: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="priceIndicator">Индикация цены</label>
          <select
            id="priceIndicator"
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
          <label className={styles.label} htmlFor="description">Описание</label>
          <textarea
            id="description"
            className={styles.textarea}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
          />
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Размещение</h3>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="placementType">Тип размещения</label>
            <select
              id="placementType"
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
            <label className={styles.label} htmlFor="placementPrice">Цена размещения, ₽</label>
            <input
              id="placementPrice"
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
            <label className={styles.label} htmlFor="moderationStatus">Статус</label>
            <select
              id="moderationStatus"
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
                <img src={img.url} alt={`Существующее фото ${img.id}`} className={styles.previewImg} />
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
                <img src={url} alt={`Предпросмотр фото ${idx + 1}`} className={styles.previewImg} />
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

        <button type="submit" className={styles.submitBtn} disabled={loading || !!success}>
          {success ? 'Сохранено' : loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}
