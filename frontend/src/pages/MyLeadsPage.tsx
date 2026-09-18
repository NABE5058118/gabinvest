import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';
import { getLeadClientId } from '../utils/types';
import { Lead } from '../utils/types';
import styles from './MyLeadsPage.module.css';

export default function MyLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/leads/my', {
        headers: { 'x-client-id': getLeadClientId() },
      });
      setLeads(data);
    } catch (err) {
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
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

  const statusLabels: Record<string, string> = {
    new: 'Новая',
    in_progress: 'В работе',
    done: 'Завершена',
    cancelled: 'Отменена',
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.title}>Мои заявки</h1>
      </header>

      <div className={styles.content}>
        {loading && <div className={styles.empty}>Загрузка...</div>}
        {error && <div className={styles.empty}>{error}</div>}
        {!loading && !error && leads.length === 0 && (
          <div className={styles.empty}>У вас пока нет заявок</div>
        )}
        {leads.map((lead) => (
          <div key={lead.id} className={styles.item}>
            <div className={styles.itemHeader}>
              <div className={styles.itemTitle}>
                {lead.object?.title || `Объект ${lead.objectId}`}
              </div>
              <div className={styles.itemStatus}>{statusLabels[lead.status] || lead.status}</div>
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
  );
}
