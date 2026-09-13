import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { useObjects } from '../utils/useObjects';
import { ObjectType } from '../utils/types';
import styles from './FavoritesPage.module.css';

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { favoriteIds } = useFavorites();
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
    <div className={styles.page}>
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
          favorites.map((obj) => (
            <div key={obj.id} className={styles.card} onClick={() => navigate(`/objects/${obj.id}`)}>
              <div className={styles.cardImage}>
                <div className={styles.placeholder}>
                  <Heart size={48} strokeWidth={1} color="#ccc" />
                </div>
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{obj.title}</h3>
                <p className={styles.cardLocation}>{obj.location}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.price}>{obj.price.toLocaleString('ru-RU')} ₽</span>
                  <span className={styles.yield}>Доходность: {obj.yieldPercent}%</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
