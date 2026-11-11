import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Image, BuildingComplex, MapPin } from 'lucide-react';
import { api } from '@utils/api';
import ErrorState from '@components/ErrorState';
import Header from '@components/Header';
import styles from '@styles/CasePage.module.css';

type CaseItem = {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  price?: number | null;
  imageBefore?: string | null;
  imageAfter?: string | null;
  images?: Array<{ id: string; url: string; sort: number }>;
  createdAt: string;
  updatedAt: string;
};

export default function CasePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseItem, setCaseItem] = useState<CaseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<CaseItem>(`/api/cases/${id}`)
      .then((r) => r.data)
      .then(setCaseItem)
      .catch(() => setError('Не удалось загрузить кейс'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className={styles.page}>
        <Header onBack={() => navigate('/cases')} title="Кейс" />
        <div className={styles.skeleton}>
          <div className={styles.skeletonImage} />
          <div className={styles.skeletonBody}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        </div>
      </main>
    );
  }

  if (error || !caseItem) {
    return (
      <main className={styles.page}>
        <Header onBack={() => navigate('/cases')} title="Кейс" />
        <ErrorState title={error || 'Кейс не найден'} onRetry={() => window.location.reload()} />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Header onBack={() => navigate('/cases')} title="Кейс" />

      <div className={styles.content}>
        <div className={styles.beforeAfter}>
          <div className={styles.pair}>
            {caseItem.imageBefore ? (
              <img src={caseItem.imageBefore} alt={`До: ${caseItem.title}`} className={styles.pairImg} />
            ) : (
              <div className={styles.placeholder}>
                <Image size={48} strokeWidth={1} color="#ccc" />
              </div>
            )}
            <span className={styles.pairLabel}>До</span>
          </div>
          <div className={styles.pair}>
            {caseItem.imageAfter ? (
              <img src={caseItem.imageAfter} alt={`После: ${caseItem.title}`} className={styles.pairImg} />
            ) : (
              <div className={styles.placeholder}>
                <Image size={48} strokeWidth={1} color="#ccc" />
              </div>
            )}
            <span className={styles.pairLabel}>После</span>
          </div>
        </div>

        <div className={styles.info}>
          <h1 className={styles.title}>{caseItem.title}</h1>
          {caseItem.location && (
            <div className={styles.metaRow}>
              <MapPin size={16} strokeWidth={2} />
              <span>{caseItem.location}</span>
            </div>
          )}
          {caseItem.price !== null && caseItem.price !== undefined && (
            <div className={styles.metaRow}>
              <BuildingComplex size={16} strokeWidth={2} />
              <span>{caseItem.price.toLocaleString('ru-RU')} ₽</span>
            </div>
          )}
          {caseItem.description && (
            <div className={styles.description}>
              <h3 className={styles.descriptionTitle}>Описание</h3>
              <p className={styles.descriptionText}>{caseItem.description}</p>
            </div>
          )}
        </div>

        {(caseItem.images && caseItem.images.length > 0) && (
          <div className={styles.gallery}>
            <h3 className={styles.galleryTitle}>Дополнительные фото</h3>
            <div className={styles.galleryGrid}>
              {caseItem.images.map((img: { id: string; url: string }) => (
                <img key={img.id} src={img.url} alt={caseItem.title} className={styles.galleryImg} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
