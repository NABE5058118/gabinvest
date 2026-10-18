import { RefreshCw, Filter } from 'lucide-react';
import Header from './Header';

type CatalogHeaderProps = {
  styles: Record<string, string>;
  refetch: () => void;
  setShowFilters: (value: boolean) => void;
  lastRotation: string | null;
  loading: boolean;
};

export default function CatalogHeader({
  styles,
  refetch,
  setShowFilters,
  // lastRotation,
  loading,
}: CatalogHeaderProps) {
  return (
    <Header left={
      <div>
        <img className={styles.title} src="/logo.svg" alt="GAB Invest" />
        {/*{lastRotation && (
          <p className={styles.rotationInfo}>Лента обновлена: {lastRotation}</p>
        )}*/}
      </div>
    }>
      <div className={styles.headerActions}>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => refetch()}
          aria-label="Обновить ленту"
          disabled={loading}
        >
          <RefreshCw size={24} strokeWidth={2} />
        </button>
        <button
          type="button"
          className={styles.filterBtn}
          onClick={() => setShowFilters(true)}
          aria-label="Фильтры"
          disabled={loading}
        >
          <Filter size={24} strokeWidth={2} />
        </button>
      </div>
    </Header>
  );
}
