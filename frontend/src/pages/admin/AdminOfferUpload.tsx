import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { API_URL } from '../../utils/api';
import styles from './AdminOfferUpload.module.css';

type ObjectItem = {
  id: string;
  title: string;
  offerFileUrl?: string;
  offerFileName?: string;
};

const ADMIN_TOKEN = 'change-me-in-production';

export default function AdminOfferUpload() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [object, setObject] = useState<ObjectItem | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_URL}/api/admin/objects/${id}`, {
      headers: { 'x-admin-token': ADMIN_TOKEN },
    })
      .then((r) => r.json())
      .then(setObject)
      .catch(() => setError('Ошибка загрузки'));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !id) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('offer', file);

    try {
      const res = await fetch(`${API_URL}/api/admin/objects/${id}/offer`, {
        method: 'POST',
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      const data = await res.json();
      navigate(`/admin/objects/${data.id}`);
    } catch (err) {
      setError('Ошибка загрузки файла');
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
        <h1 className={styles.title}>Коммерческое предложение</h1>
      </header>

      <div className={styles.form}>
        {object && (
          <div style={{ marginBottom: 16 }}>
            <strong>{object.title}</strong>
            {object.offerFileName && (
              <div className={styles.currentFile}>
                Текущий файл: {object.offerFileName}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Файл PDF или PPTX</label>
            <label className={styles.dropzone}>
              <input
                type="file"
                accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className={styles.fileInput}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div>
                  <Upload size={32} strokeWidth={2} style={{ marginBottom: 8 }} />
                  <div>{file.name}</div>
                </div>
              ) : (
                <div>
                  <Upload size={32} strokeWidth={2} style={{ marginBottom: 8 }} />
                  <div>Нажмите, чтобы выбрать файл</div>
                  <div style={{ fontSize: 12, color: '#999' }}>PDF или PPTX, до 20 МБ</div>
                </div>
              )}
            </label>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!file || loading}
          >
            {loading ? 'Загрузка...' : 'Сохранить файл'}
          </button>
        </form>
      </div>
    </div>
  );
}
