import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import styles from '@styles/Header.module.css';

type HeaderProps = {
  onBack?: () => void;
  backLabel?: string;
  title?: string;
  titleClassName?: string;
  left?: ReactNode;
  children?: ReactNode;
};

export default function Header({
  onBack,
  backLabel = 'Назад',
  title,
  titleClassName,
  left,
  children,
}: HeaderProps) {
  return (
    <header className={styles.root}>
      <div className={styles.inner}>
        {onBack && (
          <button
            type="button"
            className={styles.backBtn}
            onClick={onBack}
            aria-label={backLabel}
          >
            <ArrowLeft size={24} strokeWidth={2} />
          </button>
        )}
        {left && <div className={styles.left}>{left}</div>}
        {title && <h1 className={[styles.title, titleClassName].filter(Boolean).join(' ')}>{title}</h1>}
        {children && <div className={styles.actions}>{children}</div>}
      </div>
    </header>
  );
}
