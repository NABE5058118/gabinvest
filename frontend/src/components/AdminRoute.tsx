import AdminLoginPage from '../pages/AdminLoginPage';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('adminToken');

  if (!token) {
    return <AdminLoginPage />;
  }

  return children;
}
