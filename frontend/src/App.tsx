import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import CatalogPage from './pages/CatalogPage';
import Layout from './components/Layout';
import AdminRoute from './components/AdminRoute';
import { FavoritesProvider } from './context/FavoritesContext';
import { AuthProvider } from './context/AuthContext';

const ObjectPage = lazy(() => import('./pages/ObjectPage'));
const OfferPage = lazy(() => import('./pages/OfferPage'));
const LeadFormPage = lazy(() => import('./pages/LeadFormPage'));
const LeadSuccessPage = lazy(() => import('./pages/LeadSuccessPage'));
const ProfileEditPage = lazy(() => import('./pages/ProfileEditPage'));
const AdminObjectsPage = lazy(() => import('./pages/admin/AdminObjectsPage'));
const AdminObjectForm = lazy(() => import('./pages/admin/AdminObjectForm'));
const AdminOfferUpload = lazy(() => import('./pages/admin/AdminOfferUpload'));
const ModerationQueuePage = lazy(() => import('./pages/admin/ModerationQueuePage'));
const LeadsPage = lazy(() => import('./pages/LeadsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MyLeadsPage = lazy(() => import('./pages/MyLeadsPage'));
const LinkTelegramPage = lazy(() => import('./pages/LinkTelegramPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfUsePage = lazy(() => import('./pages/TermsOfUsePage'));

const RouteLoading = () => (
  <div style={{ padding: 24 }}>Загрузка...</div>
);

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteLoading />}>
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
              <Route path="profile/link-telegram" element={<LinkTelegramPage />} />
              <Route path="profile/edit" element={<ProfileEditPage />} />
              </Route>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-of-use" element={<TermsOfUsePage />} />
              <Route path="/admin-login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
                <Route index element={<AdminObjectsPage />} />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="moderation" element={<ModerationQueuePage />} />
                <Route path="objects/new" element={<AdminObjectForm />} />
                <Route path="objects/:id" element={<AdminObjectForm />} />
                <Route path="objects/:id/offer" element={<AdminOfferUpload />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </FavoritesProvider>
    </AuthProvider>
  );
}
