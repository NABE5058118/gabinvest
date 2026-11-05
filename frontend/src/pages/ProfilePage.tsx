import { User, ChevronRight, Settings, LogOut, FileText, Smartphone, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api, getErrorMessage } from '@utils/api';
import { useAuth } from '@context/AuthContext';
import Header from '@components/Header';
import styles from '@styles/ProfilePage.module.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Пользователь';
  const displayUsername = user?.username ? `@${user.username}` : '';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    setDeleteLoading(true);

    try {
      await api.delete('/api/auth/delete-account');
      logout();
      localStorage.removeItem('lead_client_id');
      setDeleteModalOpen(false);
      navigate('/');
    } catch (err: unknown) {
      setDeleteError(getErrorMessage(err, 'Не удалось удалить аккаунт. Попробуйте ещё раз.'));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Header title="Профиль" />

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
          <button className={styles.menuItem} onClick={() => navigate('/profile/leads')}>
            <div className={styles.menuItemLeft}>
              <FileText size={20} strokeWidth={2} />
              <span>Мои заявки</span>
            </div>
            <ChevronRight size={20} strokeWidth={2} className={styles.menuItemRight} />
          </button>
          <button className={styles.menuItem} onClick={() => navigate('/profile/link-telegram')}>
            <div className={styles.menuItemLeft}>
              <Smartphone size={20} strokeWidth={2} />
              <span>{user?.telegramId ? 'Telegram привязан' : 'Привязать Telegram'}</span>
            </div>
            <ChevronRight size={20} strokeWidth={2} className={styles.menuItemRight} />
          </button>
          <button className={styles.menuItem} onClick={() => setDeleteModalOpen(true)}>
            <div className={styles.menuItemLeft}>
              <Trash2 size={20} strokeWidth={2} />
              <span>Удалить аккаунт</span>
            </div>
            <ChevronRight size={20} strokeWidth={2} className={styles.menuItemRight} />
          </button>
          <button className={styles.menuItem} onClick={handleLogout}>
            <div className={styles.menuItemLeft}>
              <LogOut size={20} strokeWidth={2} />
              <span>Выход</span>
            </div>
            <ChevronRight size={20} strokeWidth={2} className={styles.menuItemRight} />
          </button>
        </div>
      </div>

      {deleteModalOpen && (
        <div className={styles.deleteModalOverlay} onClick={() => setDeleteModalOpen(false)}>
          <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
            <h2>Удалить аккаунт</h2>
            <p>После удаления все ваши персональные данные, заявки, история просмотров и привязанные данные будут безвозвратно удалены. Восстановить аккаунт будет невозможно.</p>
            <p>Это действие неотвратимо.</p>

            {deleteError && <div className={styles.deleteError}>{deleteError}</div>}

            <form className={styles.deleteForm} onSubmit={handleDeleteAccount}>
              <label className={styles.deleteCheckbox}>
                <input
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={(e) => setDeleteConfirmed(e.target.checked)}
                  required
                />
                <span>Я понимаю, что удаление необратимо и все мои данные будут удалены без возможности восстановления</span>
              </label>

              <button
                type="submit"
                className={styles.deleteSubmitBtn}
                disabled={deleteLoading || !deleteConfirmed}
              >
                {deleteLoading ? 'Удаление...' : 'Удалить аккаунт'}
              </button>

              <button
                type="button"
                className={styles.deleteCancelBtn}
                onClick={() => setDeleteModalOpen(false)}
              >
                Отмена
              </button>
            </form>
          </div>
        </div>
      )}

      <div className={styles.legalFooter}>
        <a
          href="/privacy-policy"
          onClick={(e) => { e.preventDefault(); navigate('/privacy-policy'); }}
          className={styles.legalLink}
        >
          Политика конфиденциальности
        </a>
        <span className={styles.legalSeparator}>|</span>
        <a
          href="/terms-of-use"
          onClick={(e) => { e.preventDefault(); navigate('/terms-of-use'); }}
          className={styles.legalLink}
        >
          Условия использования
        </a>
      </div>
    </div>
  );
}
