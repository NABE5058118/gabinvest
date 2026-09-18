import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CatalogPage from './pages/CatalogPage';
import ObjectPage from './pages/ObjectPage';
import OfferPage from './pages/OfferPage';
import LeadFormPage from './pages/LeadFormPage';
import LeadSuccessPage from './pages/LeadSuccessPage';
import MyLeadsPage from './pages/MyLeadsPage';
import LeadsPage from './pages/LeadsPage';
import FavoritesPage from './pages/FavoritesPage';
import ProfilePage from './pages/ProfilePage';
import ProfileEditPage from './pages/ProfileEditPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminObjectsPage from './pages/admin/AdminObjectsPage';
import AdminObjectForm from './pages/admin/AdminObjectForm';
import AdminOfferUpload from './pages/admin/AdminOfferUpload';
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
              <Route path="objects/:id" element={<ObjectPage />} />
              <Route path="objects/:id/offer" element={<OfferPage />} />
              <Route path="objects/:id/lead" element={<LeadFormPage />} />
              <Route path="lead-success" element={<LeadSuccessPage />} />
              <Route path="favorites" element={<FavoritesPage />} />
              <Route path="profile/leads" element={<MyLeadsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="profile/edit" element={<ProfileEditPage />} />
            </Route>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminRoute><Layout /></AdminRoute>}>
              <Route index element={<AdminObjectsPage />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="objects/new" element={<AdminObjectForm />} />
              <Route path="objects/:id" element={<AdminObjectForm />} />
              <Route path="objects/:id/offer" element={<AdminOfferUpload />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FavoritesProvider>
    </AuthProvider>
  );
}
