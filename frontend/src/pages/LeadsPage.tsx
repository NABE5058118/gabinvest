import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { API_URL } from '../utils/api';
import styles from './LeadsPage.module.css';

type Lead = {
  id: string;
  objectId: string;
  name: string;
  phone: string;
  comment?: string;
  status: string;
  createdAt: string;
  object?: {
    title: string;
  };
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || '';

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/leads`, {
        headers: {
          'x-admin-token': ADMIN_TOKEN,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
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
              <div className={styles.itemStatus}>{lead.status}</div>
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
