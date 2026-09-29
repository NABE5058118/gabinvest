import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, LayoutGrid } from 'lucide-react';
import { useFavorites } from '@context/FavoritesContext';
import { useObjects } from '@utils/useObjects';
import { ObjectType } from '@utils/types';
import styles from '@styles/FavoritesPage.module.css';

const typeLabels: Record<string, string> = {
  'Офис': 'Офис',
  'Склад': 'Склад',
  'Торговое помещение': 'Торговое помещение',
  'Другое': 'Другое',
};

const priceIndicatorLabels: Record<string, { label: string }> = {
  'above_market': { label: 'Выше рынка' },
  'market': { label: 'По рынку' },
  'below_market': { label: 'Ниже рынка' },
};

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { objects, loading, error } = useObjects();
  const favorites = objects.filter((obj): obj is ObjectType => favoriteIds.has(obj.id));

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Избранное</h1>
      </header>

      <div className={styles.content}>
        {favorites.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <Heart size={80} strokeWidth={1.5} color="#ccc" />
            </div>
            <p className={styles.emptyText}>В избранном пока пусто</p>
            <p className={styles.emptyHint}>Добавьте понравившиеся объекты, чтобы вернуться к ним позже</p>
            <button className={styles.emptyBtn} onClick={() => navigate('/')}>
              Перейти в каталог
            </button>
          </div>
        ) : (
          <div className={styles.list}>
            {favorites.map((obj) => (
              <div
                key={obj.id}
                className={styles.card}
                onClick={() => navigate(`/objects/${obj.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if ((e.target as HTMLElement).closest('button')) return;
                    e.preventDefault();
                    navigate(`/objects/${obj.id}`);
                  }
                }}
                tabIndex={0}
                role="link"
              >
                <div className={styles.cardImage}>
                  {obj.images && obj.images.length > 0 ? (
                    <img
                      src={obj.images[0].url}
                      alt={obj.title}
                      className={styles.cardImg}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : obj.image ? (
                    <img
                      src={obj.image}
                      alt={obj.title}
                      className={styles.cardImg}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className={styles.placeholder}>
                      <LayoutGrid size={48} strokeWidth={1} color="#ccc" />
                    </div>
                  )}
                  <span className={styles.typeBadge}>{typeLabels[obj.type] || obj.type}</span>
                  {obj.priceIndicator && priceIndicatorLabels[obj.priceIndicator] && (
                    <span className={`${styles.priceIndicatorBadge} ${styles[obj.priceIndicator]}`}>
                      {priceIndicatorLabels[obj.priceIndicator].label}
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles.favoriteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(obj.id);
                    }}
                    aria-label={favoriteIds.has(obj.id) ? 'Убрать из избранного' : 'Добавить в избранное'}
                  >
                    <Heart size={20} strokeWidth={2} fill={favoriteIds.has(obj.id) ? '#000' : 'none'} />
                  </button>
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardTitle}>{obj.title}</h3>
                  <p className={styles.cardLocation}>
                    <MapPin size={12} strokeWidth={2} />
                    {obj.location}
                  </p>
                  <div className={styles.cardFooter}>
                    <span className={styles.price}>{obj.price.toLocaleString('ru-RU')} ₽</span>
                    <span className={styles.yield}>Доходность: {obj.yieldPercent}%</span>
                  </div>
                  {obj.anchorTenantName && (
                    <div className={styles.anchorTenant}>
                      Якорный арендатор: {obj.anchorTenantName}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
