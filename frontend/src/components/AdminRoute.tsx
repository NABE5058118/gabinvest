import { Navigate } from 'react-router-dom';

function getAdminUser() {
  try {
    const stored = localStorage.getItem('adminUser');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const adminUser = getAdminUser();

  if (!adminUser || adminUser.role !== 'admin') {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
}
