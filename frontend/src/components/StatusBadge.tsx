import type { CSSProperties } from 'react';
import styles from '@styles/Status.module.css';
import { statusLabel, statusOptions, type StatusVariant } from '@utils/status';

type StatusBadgeProps = {
  status: string;
  variant: StatusVariant;
  onChange?: (value: string) => void;
  className?: string;
  style?: CSSProperties;
  dot?: boolean;
};

export default function StatusBadge({
  status,
  variant,
  onChange,
  className,
  style,
  dot = false,
}: StatusBadgeProps) {
  const options = statusOptions(variant);
  const label = statusLabel(variant, status);
  const base = [styles.badge, styles[variant], styles[status], className].filter(Boolean).join(' ');

  if (onChange) {
    return (
      <select
        className={styles.statusSelect}
        value={status}
        onChange={(e) => onChange(e.target.value)}
        style={style}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span className={base} style={style}>
      {dot && <span className={styles.dot} style={{ backgroundColor: 'currentColor' }} />}
      {label}
    </span>
  );
}
