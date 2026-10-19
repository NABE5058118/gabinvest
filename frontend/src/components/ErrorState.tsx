import { AlertCircle, RefreshCw } from 'lucide-react';
import styles from '@styles/ErrorState.module.css';

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export default function ErrorState({
  title = 'Ошибка загрузки данных',
  description,
  onRetry,
  retryLabel = 'Обновить страницу',
}: ErrorStateProps) {
  return (
    <div className={styles.root} role="alert">
      <div className={styles.icon}>
        <AlertCircle size={56} strokeWidth={1.2} />
      </div>
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {onRetry && (
        <button type="button" className={styles.retryBtn} onClick={onRetry}>
          <RefreshCw size={18} strokeWidth={2} style={{ marginRight: 6 }} />
          {retryLabel}
        </button>
      )}
    </div>
  );
}