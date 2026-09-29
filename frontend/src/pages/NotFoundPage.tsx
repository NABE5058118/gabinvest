import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import styles from '@styles/NotFoundPage.module.css';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.code}>404</h1>
        <p className={styles.text}>Страница не найдена</p>
        <p className={styles.hint}>
          Возможно, она была удалена или вы перешли по неверной ссылке.
        </p>
        <button className={styles.button} onClick={() => navigate('/')}>
          <ArrowLeft size={18} strokeWidth={2} />
          На главную
        </button>
      </div>
    </div>
  );
}
