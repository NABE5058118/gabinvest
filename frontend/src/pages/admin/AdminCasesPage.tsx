import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Image } from 'lucide-react';
import { adminApi, getErrorMessage } from '@utils/adminApi';
import ErrorState from '@components/ErrorState';
import Header from '@components/Header';
import ConfirmModal from '@components/ConfirmModal';
import StatusBadge from '@components/StatusBadge';
import StatusFilter from '@components/StatusFilter';
import styles from '@styles/AdminCases.module.css';

type CaseItem = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  price?: number | null;
  imageBefore?: string | null;
  imageAfter?: string | null;
  status: string;
  images?: Array<{ id: string; url: string; sort: number }>;
  createdAt: string;
  updatedAt: string;
};

export default function AdminCasesPage() {
  const [items, setItems] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  const fetchItems = async () => {
    try {
      setLoading(true);
      const all: CaseItem[] = [];
      for (let page = 1; page <= 10000; page += 1) {
        const { data } = await adminApi.get('/api/admin/cases', {
          params: { page, limit: 50, ...(statusFilter ? { status: statusFilter } : {}) },
        });
        all.push(...data.cases);
        if (data.cases.length < 50) break;
      }
      setItems(all);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Ошибка загрузки'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
  }, [statusFilter]);

  const requestDelete = (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    setDeleteLoading(true);
    try {
      await adminApi.delete(`/api/admin/cases/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setToast({ type: 'success', message: 'Кейс удалён' });
      window.dispatchEvent(new Event('cases:refresh'));
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Ошибка удаления'));
      setToast({ type: 'error', message: 'Ошибка удаления' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await adminApi.patch(`/api/admin/cases/${id}/status`, { status });
      setItems((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
      window.dispatchEvent(new Event('cases:refresh'));
      setToast({ type: 'success', message: 'Статус обновлён' });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Не удалось обновить статус'));
    }
  };

  return (
    <div className={styles.page}>
      <Header title="Кейсы" />

      <div className={styles.content}>
        <div className={styles.toolbar}>
          <button className={styles.addBtn} onClick={() => navigate('/admin/cases/new')}>
            <Plus size={20} strokeWidth={2} style={{ marginRight: 8 }} />
            Добавить кейс
          </button>

          <StatusFilter
            variant="moderation"
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        {loading && <div className={styles.empty}>Загрузка...</div>}
        {error && <ErrorState title="Не удалось загрузить кейсы" onRetry={fetchItems} />}
        {toast && (
          <div className={toast.type === 'success' ? styles.toastSuccess : styles.toastError} role="status" aria-live="polite">
            {toast.message}
          </div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className={styles.empty}>Нет кейсов</div>
        )}
        {items.map((item) => (
          <div key={item.id} className={styles.item}>
            <div className={styles.itemHeader}>
              <div className={styles.itemTitle}>{item.title}</div>
              <StatusBadge status={item.status} variant="moderation" onChange={(status) => handleStatusChange(item.id, status)} />
            </div>
            {item.location && <div className={styles.itemMeta}>{item.location}</div>}
            {item.price !== null && item.price !== undefined && (
              <div className={styles.itemMeta}>
                {item.price.toLocaleString('ru-RU')} ₽
              </div>
            )}
            <div className={styles.itemImages}>
              {item.imageBefore && (
                <img
                  src={item.imageBefore}
                  alt={`До: ${item.title}`}
                  className={styles.thumb}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              {item.imageAfter && (
                <img
                  src={item.imageAfter}
                  alt={`После: ${item.title}`}
                  className={styles.thumb}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              {(item.images && item.images.length > 0) && item.images.map((img) => (
                <img key={img.id} src={img.url} alt={item.title} className={styles.thumb} />
              ))}
              {!item.imageBefore && !item.imageAfter && (!item.images || item.images.length === 0) && (
                <div className={styles.placeholderThumb}>
                  <Image size={24} strokeWidth={1} color="#ccc" />
                </div>
              )}
            </div>
            <div className={styles.itemActions}>
              <button
                className={styles.actionBtn}
                onClick={() => navigate(`/admin/cases/${item.id}`)}
              >
                Редактировать
              </button>
              <button
                className={`${styles.actionBtn} ${styles.dangerAction}`}
                onClick={() => requestDelete(item.id)}
                aria-label="Удалить кейс"
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        message="Вы действительно хотите удалить кейс? Это действие нельзя отменить."
        confirmLabel="Удалить"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
