import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { adminApi } from '@utils/adminApi';
import { Lead } from '@utils/types';
import styles from '@styles/LeadsPage.module.css';

const STATUS_OPTIONS = [
  { value: 'new', label: 'Новая' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Завершена' },
  { value: 'cancelled', label: 'Отменена' },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Заявки</h1>
      </header>

      <div className={styles.content}>
        {loading && <div className={styles.empty}>Загрузка...</div>}
        {error && <div className={styles.empty}>{error}</div>}
        {!loading && !error && leads.length === 0 && (
          <div className={styles.empty}>Нет заявок</div>
        )}
        {leads.map((lead) => (
          <div key={lead.id} className={styles.item}>
            <div className={styles.itemHeader}>
              <div className={styles.itemTitle}>
                {lead.object?.title || `Объект ${lead.objectId}`}
              </div>
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
  );
}
