import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import styles from './LeadSuccessPage.module.css';

export default function LeadSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.icon}>
          <Check size={48} strokeWidth={3} color="#fff" />
        </div>
        <h1 className={styles.title}>Заявка отправлена!</h1>
        <p className={styles.subtitle}>Мы свяжемся с вами в ближайшее время</p>

        <button className={styles.primaryBtn} onClick={() => navigate('/')}>
          Вернуться в каталог
        </button>
      </div>
    </div>
  );
}
