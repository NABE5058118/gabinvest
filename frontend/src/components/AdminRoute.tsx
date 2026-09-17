import { Navigate, useLocation } from 'react-router-dom';
import AdminLoginPage from '../pages/AdminLoginPage';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('adminToken');
  const location = useLocation();

  if (!token) {
    return <AdminLoginPage />;
  }

  return children;
}
