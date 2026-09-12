import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import styles from './FavoritesPage.module.css';

export default function FavoritesPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Избранное</h1>
      </header>

      <div className={styles.content}>
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
      </div>
    </div>
  );
}
