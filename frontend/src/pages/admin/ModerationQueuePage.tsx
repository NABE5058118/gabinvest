import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Eye } from 'lucide-react';
import PageHeader from '@components/PageHeader';
import { adminApi } from '@utils/adminApi';
import styles from '@styles/ModerationQueue.module.css';

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
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const all: ModerationItem[] = [];
        for (let page = 1; page <= 10000; page += 1) {
          const { data } = await adminApi.get('/api/admin/moderation/queue', { params: { status: statusFilter, page, limit: 50 } });
          all.push(...data);
          if (data.length < 50) break;
        }
        if (!cancelled) setItems(all);
      } catch {
        if (!cancelled) {
          setError('Ошибка загрузки');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  const handleStatusUpdate = async (objectId: string, newStatus: string) => {
    try {
      await adminApi.patch(`/api/admin/objects/${objectId}/moderation`, { status: newStatus });
      setItems(items.filter((i) => i.objectId !== objectId));
      window.dispatchEvent(new Event('objects:refresh'));
    } catch {
      // ignore
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Модерация"
        titleClassName={styles.title}
        onBack={() => navigate('/admin')}
        backBtnClassName={styles.backBtn}
      />

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
