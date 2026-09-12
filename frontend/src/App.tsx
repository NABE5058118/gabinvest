import { BrowserRouter, Routes, Route } from 'react-router-dom';
import CatalogPage from './pages/CatalogPage';
import ObjectPage from './pages/ObjectPage';
import OfferPage from './pages/OfferPage';
import LeadFormPage from './pages/LeadFormPage';
import LeadSuccessPage from './pages/LeadSuccessPage';
import FavoritesPage from './pages/FavoritesPage';
import Layout from './components/Layout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<CatalogPage />} />
          <Route path="objects/:id" element={<ObjectPage />} />
          <Route path="objects/:id/offer" element={<OfferPage />} />
          <Route path="objects/:id/lead" element={<LeadFormPage />} />
          <Route path="lead-success" element={<LeadSuccessPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
