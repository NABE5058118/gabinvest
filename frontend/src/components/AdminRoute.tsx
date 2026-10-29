import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { adminApi } from '../utils/adminApi';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    adminApi
      .get('/api/admin/auth/me')
      .then(() => setAuthorized(true))
      .catch(() => setAuthorized(false));
  }, []);

  if (authorized === null) {
    return null;
  }

  if (!authorized) {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
}
