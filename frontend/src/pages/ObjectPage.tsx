import { useParams, useNavigate } from 'react-router-dom';
import { mockObjects } from '../utils/mockData';
import { ArrowLeft, Heart, MapPin, LayoutGrid } from 'lucide-react';
import styles from './ObjectPage.module.css';

export default function ObjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const object = mockObjects.find((o) => o.id === id);

  if (!object) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Объект не найден</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <button className={styles.favoriteBtn}>
          <Heart size={24} strokeWidth={2} />
        </button>
      </header>

      <div className={styles.image}>
        <div className={styles.placeholder}>
          <LayoutGrid size={64} strokeWidth={1} color="#ccc" />
        </div>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>{object.title}</h1>
        <p className={styles.location}>
          <MapPin size={14} strokeWidth={2} />
          {object.location}
        </p>

        <div className={styles.priceRow}>
          <div className={styles.price}>{object.price.toLocaleString('ru-RU')} ₽</div>
          <div className={styles.yield}>Доходность: {object.yieldPercent}%</div>
        </div>

        <div className={styles.badges}>
          <span className={styles.badge}>{object.type}</span>
          <span className={styles.badge}>Площадь: {object.area} м²</span>
          {object.roi && <span className={styles.badge}>ROI: {object.roi}%</span>}
        </div>

        <div className={styles.financials}>
          <div className={styles.financialCard}>
            <span className={styles.financialLabel}>Арендный поток</span>
            <span className={styles.financialValue}>8 500 000 ₽/мес</span>
          </div>
          <div className={styles.financialCard}>
            <span className={styles.financialLabel}>Окупаемость</span>
            <span className={styles.financialValue}>10.2 лет</span>
          </div>
          <div className={styles.financialCard}>
            <span className={styles.financialLabel}>ROI</span>
            <span className={styles.financialValue}>9.5%</span>
          </div>
        </div>

        <button className={styles.primaryBtn} onClick={() => navigate(`/objects/${id}/offer`)}>
          Коммерческое предложение
        </button>
        <button className={styles.secondaryBtn} onClick={() => navigate(`/objects/${id}/lead`)}>
          Оставить заявку
        </button>
        <button className={styles.managerLink} onClick={() => navigate(`/objects/${id}/lead`)}>
          Связаться с менеджером
        </button>

        {object.description && (
          <div className={styles.description}>
            <h2>Описание</h2>
            <p>{object.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
