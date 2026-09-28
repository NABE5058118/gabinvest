import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CatalogPage from './pages/CatalogPage';
import ObjectPage from './pages/ObjectPage';
import OfferPage from './pages/OfferPage';
import LeadFormPage from './pages/LeadFormPage';
import LeadSuccessPage from './pages/LeadSuccessPage';
import MyLeadsPage from './pages/MyLeadsPage';
import FavoritesPage from './pages/FavoritesPage';
import ProfilePage from './pages/ProfilePage';
import ProfileEditPage from './pages/ProfileEditPage';
import AdminLoginPage from './pages/AdminLoginPage';
import Layout from './components/Layout';
import AdminRoute from './components/AdminRoute';
import { FavoritesProvider } from './context/FavoritesContext';
import { AuthProvider } from './context/AuthContext';

const LeadsPage = lazy(() => import('./pages/LeadsPage'));
const AdminObjectsPage = lazy(() => import('./pages/admin/AdminObjectsPage'));
const AdminObjectForm = lazy(() => import('./pages/admin/AdminObjectForm'));
const AdminOfferUpload = lazy(() => import('./pages/admin/AdminOfferUpload'));
const ModerationQueuePage = lazy(() => import('./pages/admin/ModerationQueuePage'));

function AdminSuspense() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: '#6b7280' }}>
      Загрузка…
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<CatalogPage />} />
              <Route path="objects/:id" element={<ObjectPage />} />
              <Route path="objects/:id/offer" element={<OfferPage />} />
              <Route path="objects/:id/lead" element={<LeadFormPage />} />
              <Route path="lead-success" element={<LeadSuccessPage />} />
              <Route path="favorites" element={<FavoritesPage />} />
              <Route path="profile/leads" element={<MyLeadsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="profile/edit" element={<ProfileEditPage />} />
            </Route>
            {/* <Route path="/login" element={<LoginPage />} /> */}
            {/* <Route path="/register" element={<RegisterPage />} /> */}
            {/* <Route path="/telegram-auth" element={<TelegramAuthPage />} /> */}
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
              <Route index element={<Suspense fallback={<AdminSuspense />}><AdminObjectsPage /></Suspense>} />
              <Route path="leads" element={<Suspense fallback={<AdminSuspense />}><LeadsPage /></Suspense>} />
              <Route path="moderation" element={<Suspense fallback={<AdminSuspense />}><ModerationQueuePage /></Suspense>} />
              <Route path="objects/new" element={<Suspense fallback={<AdminSuspense />}><AdminObjectForm /></Suspense>} />
              <Route path="objects/:id" element={<Suspense fallback={<AdminSuspense />}><AdminObjectForm /></Suspense>} />
              <Route path="objects/:id/offer" element={<Suspense fallback={<AdminSuspense />}><AdminOfferUpload /></Suspense>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FavoritesProvider>
    </AuthProvider>
  );
}
