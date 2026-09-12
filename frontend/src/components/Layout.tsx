import { Outlet, NavLink } from 'react-router-dom';
import { LayoutGrid, Heart, FileText, User } from 'lucide-react';
import styles from './Layout.module.css';

export default function Layout() {
  return (
    <div className={styles.layout}>
      <div className={styles.content}>
        <Outlet />
      </div>
      <nav className={styles.nav}>
        <NavLink to="/" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <LayoutGrid size={24} strokeWidth={2} />
          <span>Каталог</span>
        </NavLink>
        <NavLink to="/favorites" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <Heart size={24} strokeWidth={2} />
          <span>Избранное</span>
        </NavLink>
        <NavLink to="/" className={styles.navItem}>
          <FileText size={24} strokeWidth={2} />
          <span>Заявки</span>
        </NavLink>
        <NavLink to="/" className={styles.navItem}>
          <User size={24} strokeWidth={2} />
          <span>Профиль</span>
        </NavLink>
      </nav>
    </div>
  );
}
