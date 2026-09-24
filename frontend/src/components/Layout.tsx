import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutGrid, Heart, FileText, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './Layout.module.css';

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  const handleAdminLogout = () => {
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
        {isAdminPage ? (
          <>
            <NavLink to="/admin/leads" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <FileText size={24} strokeWidth={2} />
              <span>Заявки</span>
            </NavLink>
            <button className={styles.navItem} onClick={handleAdminLogout}>
              <LogOut size={24} strokeWidth={2} />
              <span>Выход</span>
            </button>
          </>
        ) : (
          <>
            <NavLink to="/" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <LayoutGrid size={24} strokeWidth={2} />
              <span>Каталог</span>
            </NavLink>
            <NavLink to="/favorites" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <Heart size={24} strokeWidth={2} />
              <span>Избранное</span>
            </NavLink>
            <NavLink to="/profile/leads" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <FileText size={24} strokeWidth={2} />
              <span>Заявки</span>
            </NavLink>
            {user ? (
              <NavLink to="/profile" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
                <User size={24} strokeWidth={2} />
                <span>Профиль</span>
              </NavLink>
            ) : null}
          </>
        )}
      </nav>
    </div>
  );
}
