import { Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '@components/Header';
import { adminApi } from '@utils/adminApi';
import styles from '@styles/AdminCaseForm.module.css';

type CaseItem = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  price?: number | null;
  imageBefore?: string | null;
  imageAfter?: string | null;
  status?: string;
  images?: Array<{ id: string; url: string }>;
};

export default function AdminCaseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    price: '',
    status: 'pending' as string,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<Array<{ id: string; url: string }>>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSuccess(null);
    setError(null);
    setFieldErrors({});
    setToast(null);
  }, [form.title]);

  useEffect(() => {
    if (id && id !== 'new') {
      adminApi.get(`/api/admin/cases/${id}`)
        .then((r) => r.data)
        .then((data: CaseItem) => {
          setForm({
            title: data.title,
            description: data.description || '',
            location: data.location || '',
            price: data.price ? String(data.price) : '',
            status: data.status || 'pending',
          });
          setBeforePreview(data.imageBefore || null);
          setAfterPreview(data.imageAfter || null);
          setExistingImages((data.images || []).map((img) => ({ id: img.id, url: img.url })));
        })
        .catch(() => setError('Ошибка загрузки'));
    }
  }, [id]);

  const handleImageChange = (field: 'before' | 'after') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    if (field === 'before') {
      setBeforeFile(file);
      setBeforePreview(URL.createObjectURL(file));
    } else {
      setAfterFile(file);
      setAfterPreview(URL.createObjectURL(file));
    }
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setNewImageFiles((prev) => [...prev, ...files]);
    setNewImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const uploadImages = async (caseId: string): Promise<void> => {
    if (!newImageFiles.length) return;
    const formData = new FormData();
    newImageFiles.forEach((file) => formData.append('images', file));
    await adminApi.post(`/api/admin/cases/${caseId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const uploadSingleImage = async (caseId: string, field: 'before' | 'after', file: File | null): Promise<void> => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    const endpoint = field === 'before' ? 'image-before' : 'image-after';
    await adminApi.post(`/api/admin/cases/${caseId}/${endpoint}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const deleteImage = async (imageId: string): Promise<void> => {
    const caseId = id && id !== 'new' ? id : '0';
    await adminApi.delete(`/api/admin/cases/${caseId}/images/${imageId}`);
    setExistingImages((prev) => prev.filter((i) => i.id !== imageId));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = 'Укажите название';
    if (form.price !== '' && (Number(form.price) <= 0 || Number(form.price) > 2_147_483_647)) {
      errors.price = 'Укажите корректную цену';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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
      description: form.description || null,
      location: form.location || null,
      price: form.price ? Number(form.price) : null,
      status: form.status,
    };

    try {
      let data: CaseItem;
      if (id && id !== 'new') {
        const res = await adminApi.put(`/api/admin/cases/${id}`, payload);
        data = res.data;
      } else {
        const res = await adminApi.post('/api/admin/cases', payload);
        data = res.data;
      }

      // Upload before/after images
      await uploadSingleImage(data.id, 'before', beforeFile);
      await uploadSingleImage(data.id, 'after', afterFile);

      // Upload gallery images
      if (newImageFiles.length) {
        await uploadImages(data.id);
      }

      window.dispatchEvent(new Event('cases:refresh'));
      setSuccess('Сохранено');
      setToast({ type: 'success', message: 'Сохранено' });

      setTimeout(() => {
        navigate('/admin/cases');
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
      <Header onBack={() => navigate('/admin/cases')} title={id && id !== 'new' ? 'Редактировать кейс' : 'Новый кейс'} />

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
          <label className={styles.label} htmlFor="location">Локация</label>
          <input
            id="location"
            className={styles.input}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="price">Цена продажи, ₽</label>
          <input
            id="price"
            className={styles.input}
            type="number"
            min="0"
            max={2147483647}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            aria-invalid={!!fieldErrors.price}
            aria-describedby={fieldErrors.price ? 'field-error-price' : undefined}
          />
          {fieldErrors.price && <div id="field-error-price" className={styles.fieldError}>{fieldErrors.price}</div>}
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

        <div className={styles.field}>
          <label className={styles.label} htmlFor="status">Статус</label>
          <select
            id="status"
            className={styles.select}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="pending">На проверке</option>
            <option value="approved">Одобрено</option>
            <option value="rejected">Отклонено</option>
          </select>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Фото до / после</h3>
          <div className={styles.imagePair}>
            <div className={styles.imageSide}>
              <label className={styles.imageLabel}>До</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleImageChange('before')}
              />
              {beforePreview && (
                <div className={styles.imagePreview}>
                  <img src={beforePreview} alt="До" className={styles.previewImg} />
                  <button type="button" className={styles.removeBtn} onClick={() => {
                    setBeforeFile(null);
                    setBeforePreview(null);
                  }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className={styles.imageSide}>
              <label className={styles.imageLabel}>После</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleImageChange('after')}
              />
              {afterPreview && (
                <div className={styles.imagePreview}>
                  <img src={afterPreview} alt="После" className={styles.previewImg} />
                  <button type="button" className={styles.removeBtn} onClick={() => {
                    setAfterFile(null);
                    setAfterPreview(null);
                  }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Дополнительные фото</h3>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            multiple
            onChange={handleGalleryChange}
          />
          <div className={styles.imagePreviewGrid}>
            {existingImages.map((img) => (
              <div key={img.id} className={styles.imagePreviewItem}>
                <img src={img.url} alt={`Фото ${img.id}`} className={styles.previewImg} />
                <button
                  type="button"
                  className={styles.removeImageBtn}
                  onClick={() => deleteImage(img.id)}
                  aria-label="Удалить фото"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {newImagePreviews.map((url, idx) => (
              <div key={idx} className={styles.imagePreviewItem}>
                <img src={url} alt={`Предпросмотр ${idx + 1}`} className={styles.previewImg} />
                <button
                  type="button"
                  className={styles.removeImageBtn}
                  onClick={() => {
                    setNewImageFiles((prev) => prev.filter((_, i) => i !== idx));
                    setNewImagePreviews((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  aria-label="Удалить фото"
                >
                  <Trash2 size={16} />
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
