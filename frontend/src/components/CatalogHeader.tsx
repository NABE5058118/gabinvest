import { RefreshCw, Filter } from 'lucide-react';

type CatalogHeaderProps = {
  styles: Record<string, string>;
  refetch: () => void;
  setShowFilters: (value: boolean) => void;
  lastRotation: string | null;
  loading: boolean;
};

export default function CatalogHeader({ styles, refetch, setShowFilters, lastRotation, loading }: CatalogHeaderProps) {
  return (
    <header className={styles.header}>
      <div>
        <img className={styles.title} src="/logo.svg" alt="GAB Invest" />
        {lastRotation && (
          <p className={styles.rotationInfo}>Лента обновлена: {lastRotation}</p>
        )}
      </div>
      <div className={styles.headerActions}>
        <button
          className={styles.refreshBtn}
          onClick={() => refetch()}
          aria-label="Обновить ленту"
          disabled={loading}
        >
          <RefreshCw size={24} strokeWidth={2} />
        </button>
        <button
          className={styles.filterBtn}
          onClick={() => setShowFilters(true)}
          aria-label="Фильтры"
          disabled={loading}
        >
          <Filter size={24} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
