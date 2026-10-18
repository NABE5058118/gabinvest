import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

type PageHeaderProps = {
  className?: string;
  title?: string;
  titleClassName?: string;
  onBack?: () => void;
  backLabel?: string;
  backBtnClassName?: string;
  children?: ReactNode;
};

export default function PageHeader({
  className = 'header',
  title,
  titleClassName,
  onBack,
  backLabel = 'Назад',
  backBtnClassName,
  children,
}: PageHeaderProps) {
  return (
    <header className={className}>
      {onBack && (
        <button
          type="button"
          className={backBtnClassName}
          onClick={onBack}
          aria-label={backLabel}
        >
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
      )}
      {title && <h1 className={titleClassName}>{title}</h1>}
      {children}
    </header>
  );
}
