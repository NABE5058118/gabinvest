import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CatalogPage from './pages/CatalogPage';
import AdminLoginPage from './pages/AdminLoginPage';
import Layout from './components/Layout';
import AdminRoute from './components/AdminRoute';
import { FavoritesProvider } from './context/FavoritesContext';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<CatalogPage />} />
              <Route path="objects/:id" lazy={async () => {
                const { default: ObjectPage } = await import('./pages/ObjectPage');
                return { Component: ObjectPage };
              }} />
              <Route path="objects/:id/offer" lazy={async () => {
                const { default: OfferPage } = await import('./pages/OfferPage');
                return { Component: OfferPage };
              }} />
              <Route path="objects/:id/lead" lazy={async () => {
                const { default: LeadFormPage } = await import('./pages/LeadFormPage');
                return { Component: LeadFormPage };
              }} />
              <Route path="lead-success" lazy={async () => {
                const { default: LeadSuccessPage } = await import('./pages/LeadSuccessPage');
                return { Component: LeadSuccessPage };
              }} />
              <Route path="favorites" lazy={async () => {
                const { default: FavoritesPage } = await import('./pages/FavoritesPage');
                return { Component: FavoritesPage };
              }} />
              <Route path="profile/leads" lazy={async () => {
                const { default: MyLeadsPage } = await import('./pages/MyLeadsPage');
                return { Component: MyLeadsPage };
              }} />
              <Route path="profile" lazy={async () => {
                const { default: ProfilePage } = await import('./pages/ProfilePage');
                return { Component: ProfilePage };
              }} />
              <Route path="profile/edit" lazy={async () => {
                const { default: ProfileEditPage } = await import('./pages/ProfileEditPage');
                return { Component: ProfileEditPage };
              }} />
            </Route>
            {/* <Route path="/login" element={<LoginPage />} /> */}
            {/* <Route path="/register" element={<RegisterPage />} /> */}
            {/* <Route path="/telegram-auth" element={<TelegramAuthPage />} /> */}
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
              <Route index lazy={async () => {
                const { default: AdminObjectsPage } = await import('./pages/admin/AdminObjectsPage');
                return { Component: AdminObjectsPage };
              }} />
              <Route path="leads" lazy={async () => {
                const { default: LeadsPage } = await import('./pages/LeadsPage');
                return { Component: LeadsPage };
              }} />
              <Route path="moderation" lazy={async () => {
                const { default: ModerationQueuePage } = await import('./pages/admin/ModerationQueuePage');
                return { Component: ModerationQueuePage };
              }} />
              <Route path="objects/new" lazy={async () => {
                const { default: AdminObjectForm } = await import('./pages/admin/AdminObjectForm');
                return { Component: AdminObjectForm };
              }} />
              <Route path="objects/:id" lazy={async () => {
                const { default: AdminObjectForm } = await import('./pages/admin/AdminObjectForm');
                return { Component: AdminObjectForm };
              }} />
              <Route path="objects/:id/offer" lazy={async () => {
                const { default: AdminOfferUpload } = await import('./pages/admin/AdminOfferUpload');
                return { Component: AdminOfferUpload };
              }} />
            </Route>
            <Route path="*" lazy={async () => {
              const { default: NotFoundPage } = await import('./pages/NotFoundPage');
              return { Component: NotFoundPage };
            }} />
          </Routes>
        </BrowserRouter>
      </FavoritesProvider>
    </AuthProvider>
  );
}
