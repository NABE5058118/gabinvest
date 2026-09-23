import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Eye } from 'lucide-react';
import { adminApi } from '../../utils/adminApi';
import styles from './ModerationQueue.module.css';

type ModerationItem = {
  id: string;
  objectId: string;
  status: string;
  note?: string;
  moderatedAt?: string;
  object: {
    id: string;
    title: string;
    type: string;
    price: number;
    location: string;
    moderation?: { status: string };
  };
};

export default function ModerationQueuePage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const navigate = useNavigate();

  useEffect(() => {
    fetchItems();
  }, [statusFilter]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.get(`/api/admin/moderation/queue?status=${statusFilter}`);
      setItems(data);
    } catch (err) {
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (objectId: string, newStatus: string) => {
    try {
      await adminApi.patch(`/api/admin/objects/${objectId}/moderation`, { status: newStatus });
      setItems(items.filter((i) => i.objectId !== objectId));
    } catch {
      // ignore
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/admin')}>
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Модерация</h1>
      </header>

      <div className={styles.filterBar}>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="pending">На проверке</option>
          <option value="approved">Одобренные</option>
          <option value="rejected">Отклонённые</option>
        </select>
      </div>

      <div className={styles.content}>
        {loading && <div className={styles.empty}>Загрузка...</div>}
        {error && <div className={styles.empty}>{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className={styles.empty}>Нет объектов в очереди</div>
        )}
        {items.map((item) => (
          <div key={item.id} className={styles.item}>
            <div className={styles.itemHeader}>
              <div className={styles.itemTitle}>{item.object?.title}</div>
              <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                {item.status === 'pending' ? 'На проверке' : item.status === 'approved' ? 'Одобрено' : 'Отклонено'}
              </span>
            </div>
            <div className={styles.itemMeta}>
              {item.object?.type} • {item.object?.location} • {item.object?.price?.toLocaleString('ru-RU')} ₽
            </div>
            {item.note && <div className={styles.itemNote}>Примечание: {item.note}</div>}
            <div className={styles.itemActions}>
              <button
                className={styles.actionBtn}
                onClick={() => navigate(`/admin/objects/${item.objectId}`)}
              >
                <Eye size={16} strokeWidth={2} style={{ marginRight: 4 }} />
                Просмотр
              </button>
              {item.status === 'pending' && (
                <>
                  <button
                    className={`${styles.actionBtn} ${styles.approveBtn}`}
                    onClick={() => handleStatusUpdate(item.objectId, 'approved')}
                  >
                    <CheckCircle size={16} strokeWidth={2} style={{ marginRight: 4 }} />
                    Одобрить
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.rejectBtn}`}
                    onClick={() => handleStatusUpdate(item.objectId, 'rejected')}
                  >
                    <XCircle size={16} strokeWidth={2} style={{ marginRight: 4 }} />
                    Отклонить
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}