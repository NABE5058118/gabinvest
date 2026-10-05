import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { api } from '@utils/api';
import { getLeadClientId } from '@utils/types';
import { Lead } from '@utils/types';
import styles from '@styles/MyLeadsPage.module.css';

const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: 'Дата создания (сначала новые)' },
  { value: 'createdAt_asc', label: 'Дата создания (сначала старые)' },
  { value: 'status_asc', label: 'Статус (А-Я)' },
  { value: 'object_asc', label: 'Объект (А-Я)' },
];

export default function MyLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState('createdAt_desc');
  const navigate = useNavigate();

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const clientId = getLeadClientId();
      const { data } = await api.get('/api/leads/my', {
        headers: { 'x-client-id': clientId },
      });
      setLeads(data);
    } catch {
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeads();
  }, []);

  const clientId = getLeadClientId();

  const handleDelete = async (leadId: string) => {
    if (!confirm('Удалить заявку?')) return;
    try {
      await api.delete(`/api/leads/my/${leadId}`, {
        headers: { 'x-client-id': clientId },
      });
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch {
      // ignore
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    switch (sort) {
      case 'createdAt_asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'status_asc':
        return (a.status || '').localeCompare(b.status || '');
      case 'object_asc':
        return (a.object?.title || '').localeCompare(b.object?.title || '');
      case 'createdAt_desc':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLabels: Record<string, string> = {
    new: 'Новая',
    in_progress: 'В работе',
    done: 'Завершена',
    cancelled: 'Отменена',
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Мои заявки</h1>
        <select
          className={styles.sortSelect}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </header>

      <div className={styles.content}>
        {loading && (
          <div className={styles.skeletonList}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className={styles.skeletonCard}>
                <div className={`${styles.skeletonRow} ${styles.skeletonRowMedium}`} />
                <div className={styles.skeletonRow} />
                <div className={`${styles.skeletonRow} ${styles.skeletonRowShort}`} />
                <div className={styles.skeletonBtn} />
              </div>
            ))}
          </div>
        )}
        {error && <div className={styles.empty}>{error}</div>}
        {!loading && !error && leads.length === 0 && (
          <div className={styles.empty}>У вас пока нет заявок</div>
        )}
        <div className={styles.list}>
          {sortedLeads.map((lead) => (
            <div key={lead.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <div className={styles.itemTitle}>
                  {lead.object?.title || `Объект ${lead.objectId}`}
                </div>
                <div className={styles.itemActions}>
                  <div className={styles.itemStatus}>{statusLabels[lead.status] || lead.status}</div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(lead.id)}
                    aria-label="Удалить заявку"
                  >
                    <Trash2 size={18} strokeWidth={2} />
                  </button>
                </div>
              </div>
              <div className={styles.itemMeta}>
                <div><strong>Телефон:</strong> {lead.phone}</div>
                {lead.comment && <div><strong>Комментарий:</strong> {lead.comment}</div>}
                <div><strong>Дата:</strong> {formatDate(lead.createdAt)}</div>
              </div>
              {lead.object && (
                <button className={styles.objectBtn} onClick={() => navigate(`/objects/${lead.objectId}`)}>
                  Перейти к объекту
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
