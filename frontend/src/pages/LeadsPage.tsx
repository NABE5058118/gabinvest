import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { adminApi } from '@utils/adminApi';
import { Lead } from '@utils/types';
import styles from '@styles/LeadsPage.module.css';

const STATUS_OPTIONS = [
  { value: 'new', label: 'Новая' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Завершена' },
  { value: 'cancelled', label: 'Отменена' },
];

const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: 'Дата создания (сначала новые)' },
  { value: 'createdAt_asc', label: 'Дата создания (сначала старые)' },
  { value: 'name_asc', label: 'Имя клиента (А-Я)' },
  { value: 'name_desc', label: 'Имя клиента (Я-А)' },
  { value: 'status_asc', label: 'Статус (А-Я)' },
  { value: 'object_asc', label: 'Объект (А-Я)' },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState('createdAt_desc');
  const navigate = useNavigate();

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.get('/api/leads');
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

  const handleStatusChange = async (leadId: string, status: string) => {
    try {
      await adminApi.patch(`/api/leads/${leadId}/status`, { status });
      setLeads(leads.map((l) => (l.id === leadId ? { ...l, status } : l)));
    } catch {
      // ignore
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm('Удалить заявку?')) return;
    try {
      await adminApi.delete(`/api/leads/${leadId}`);
      setLeads(leads.filter((l) => l.id !== leadId));
    } catch {
      // ignore
    }
  };

  const sortedLeads = [...leads].sort((a, b) => {
    switch (sort) {
      case 'createdAt_asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'name_asc':
        return (a.name || '').localeCompare(b.name || '');
      case 'name_desc':
        return (b.name || '').localeCompare(a.name || '');
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Заявки</h1>
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
        {loading && <div className={styles.empty}>Загрузка...</div>}
        {error && <div className={styles.empty}>{error}</div>}
        {!loading && !error && leads.length === 0 && (
          <div className={styles.empty}>Нет заявок</div>
        )}
        <div className={styles.list}>
          {sortedLeads.map((lead) => (
            <div key={lead.id} className={styles.item}>
              <div className={styles.itemHeader}>
                <div className={styles.itemTitle}>
                  {lead.object?.title || `Объект ${lead.objectId}`}
                </div>
                <div className={styles.itemActions}>
                  <div className={styles.itemStatus}>
                    <select
                      className={styles.statusSelect}
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
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
                <div><strong>Клиент:</strong> {lead.name}</div>
                <div><strong>Телефон:</strong> {lead.phone}</div>
                {lead.comment && <div><strong>Комментарий:</strong> {lead.comment}</div>}
                <div><strong>Дата:</strong> {formatDate(lead.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
