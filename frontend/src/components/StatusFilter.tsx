import styles from '@styles/Status.module.css';
import { statusOptions, type StatusVariant, type StatusOption } from '@utils/status';

type StatusFilterProps = {
  variant: StatusVariant;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
};

export default function StatusFilter({
  variant,
  value,
  onChange,
  className,
  label = 'Все статусы',
}: StatusFilterProps) {
  const options: StatusOption[] = statusOptions(variant);

  return (
    <select
      className={[styles.filterSelect, className].filter(Boolean).join(' ')}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
