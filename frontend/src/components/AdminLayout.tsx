import { Outlet } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <div className={styles.layout}>
      <div className={styles.content}>
        <Outlet />
      </div>
      <nav className={styles.nav}>
        <button className={styles.navItem} onClick={handleLogout}>
          <LogOut size={24} strokeWidth={2} />
          <span>Выход</span>
        </button>
      </nav>
    </div>
  );
}
