import { useNavigate } from 'react-router-dom';
import { BuildingComplex, ArrowRight, ImageMinus } from 'lucide-react';
import { useCases } from '@utils/useCases';
import ErrorState from '@components/ErrorState';
import Header from '@components/Header';
import styles from '@styles/CasesPage.module.css';

export default function CasesPage() {
  const navigate = useNavigate();
  const { cases, loading, error, refetch } = useCases();

  if (loading) {
    return (
      <main className={styles.page}>
        <Header title="Кейсы" />
        <div className={styles.skeleton}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className={styles.skeletonCard}>
              <div className={styles.skeletonImage} />
              <div className={styles.skeletonBody}>
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                <div className={styles.skeletonLine} />
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.page}>
        <Header title="Кейсы" />
        <ErrorState title="Не удалось загрузить кейсы" description={error} onRetry={refetch} />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Header title="Кейсы" />

      <div className={styles.list}>
        {cases.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <BuildingComplex size={64} strokeWidth={1} color="#ccc" />
            </div>
            <p className={styles.emptyText}>Кейсы не найдены</p>
          </div>
        ) : (
          cases.map((c) => (
            <div
              key={c.id}
              className={styles.card}
              onClick={() => navigate(`/cases/${c.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  if ((e.target as HTMLElement).closest('button')) return;
                  e.preventDefault();
                  navigate(`/cases/${c.id}`);
                }
              }}
              tabIndex={0}
              role="link"
            >
              <div className={styles.cardImage}>
                {c.imageBefore && c.imageAfter ? (
                  <div className={styles.beforeAfter}>
                    <div className={styles.pair}>
                      <img
                        src={c.imageBefore}
                        alt={`До: ${c.title}`}
                        className={styles.pairImg}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className={styles.pairLabel}>До</span>
                    </div>
                    <div className={styles.pair}>
                      <img
                        src={c.imageAfter}
                        alt={`После: ${c.title}`}
                        className={styles.pairImg}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <span className={styles.pairLabel}>После</span>
                    </div>
                  </div>
                ) : c.images && c.images.length > 0 ? (
                  <img
                    src={c.images[0].url}
                    alt={c.title}
                    className={styles.cardImg}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className={styles.placeholder}>
                    <ImageMinus size={48} strokeWidth={1} color="#ccc" />
                  </div>
                )}
                <span className={styles.typeBadge}>Кейс</span>
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{c.title}</h3>
                {c.location && (
                  <p className={styles.cardLocation}>
                    <BuildingComplex size={12} strokeWidth={2} />
                    {c.location}
                  </p>
                )}
                <div className={styles.cardFooter}>
                  {c.price !== null && c.price !== undefined && (
                    <span className={styles.price}>{c.price.toLocaleString('ru-RU')} ₽</span>
                  )}
                  <button
                    type="button"
                    className={styles.viewBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/cases/${c.id}`);
                    }}
                  >
                    Подробнее <ArrowRight size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
