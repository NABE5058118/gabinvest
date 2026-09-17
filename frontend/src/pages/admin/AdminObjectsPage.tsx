import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Upload } from 'lucide-react';
import { adminApi } from '../../utils/adminApi';
import styles from './AdminObjects.module.css';

type ObjectItem = {
  id: string;
  title: string;
  type: string;
  price: number;
  yieldPercent: number;
  location: string;
  city?: string;
  area: number;
  roi?: number;
  description?: string;
  offerFileUrl?: string;
  offerFileName?: string;
  image?: string;
};

export default function AdminObjectsPage() {
  const [items, setItems] = useState<ObjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data } = await adminApi.get('/api/admin/objects');
      setItems(data);
    } catch (err) {
      setError('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить объект?')) return;
    await adminApi.delete(`/api/admin/objects/${id}`);
    setItems(items.filter((i) => i.id !== id));
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Объекты</h1>
      </header>

      <div className={styles.content}>
        <button className={styles.addBtn} onClick={() => navigate('/admin/objects/new')}>
          <Plus size={20} strokeWidth={2} style={{ marginRight: 8 }} />
          Добавить объект
        </button>

        {loading && <div className={styles.empty}>Загрузка...</div>}
        {error && <div className={styles.empty}>{error}</div>}
        {!loading && !error && items.length === 0 && (
          <div className={styles.empty}>Нет объектов</div>
        )}
        {items.map((item) => (
          <div key={item.id} className={styles.item}>
            <div className={styles.itemHeader}>
              <div className={styles.itemTitle}>{item.title}</div>
            </div>
            <div className={styles.itemMeta}>
              {item.type} • {item.location} • {item.price.toLocaleString('ru-RU')} ₽
            </div>
            {item.city && <div className={styles.itemMeta}>{item.city}</div>}
            <div className={styles.itemMeta}>
              Площадь: {item.area} м² • Доходность: {item.yieldPercent}%
            </div>
        {item.offerFileName && (
          <div className={styles.itemMeta}>КП: {item.offerFileName}</div>
        )}
        {item.image && (
          <div className={styles.itemMeta}>
            <img src={item.image} alt={item.title} className={styles.thumb} />
          </div>
        )}
            <div className={styles.itemActions}>
              <button
                className={styles.actionBtn}
                onClick={() => navigate(`/admin/objects/${item.id}`)}
              >
                Редактировать
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => navigate(`/admin/objects/${item.id}/offer`)}
              >
                <Upload size={16} strokeWidth={2} style={{ marginRight: 4 }} />
                КП
              </button>
              <button
                className={`${styles.actionBtn} ${styles.dangerAction}`}
                onClick={() => handleDelete(item.id)}
              >
                <Trash2 size={16} strokeWidth={2} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
