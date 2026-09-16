import { User, ChevronRight, Settings, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Пользователь';
  const displayUsername = user?.username ? `@${user.username}` : '';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Профиль</h1>
      </header>

      <div className={styles.content}>
        <div className={styles.profileCard}>
          <div className={styles.avatar}>
            <User size={32} strokeWidth={1.5} color="#999" />
          </div>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>{displayName}</div>
            {displayUsername && <div className={styles.profilePhone}>{displayUsername}</div>}
          </div>
        </div>

        <div className={styles.menu}>
          <button className={styles.menuItem} onClick={() => navigate('/profile/edit')}>
            <div className={styles.menuItemLeft}>
              <Settings size={20} strokeWidth={2} />
              <span>Настройки</span>
            </div>
            <ChevronRight size={20} strokeWidth={2} className={styles.menuItemRight} />
          </button>
          <div className={styles.menuItem}>
            <div className={styles.menuItemLeft}>
              <Mail size={20} strokeWidth={2} />
              <span>Почта</span>
            </div>
            <span className={user?.email ? styles.value : styles.disabled}>
              {user?.email || 'Не подключено'}
            </span>
          </div>
          <div className={styles.menuItem}>
            <div className={styles.menuItemLeft}>
              <Phone size={20} strokeWidth={2} />
              <span>Телефон</span>
            </div>
            <span className={user?.phone ? styles.value : styles.disabled}>
              {user?.phone || 'Не подключено'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
