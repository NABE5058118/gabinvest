import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, X, Heart, MapPin, LayoutGrid } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { useObjects } from '../utils/useObjects';
import styles from './CatalogPage.module.css';

const RUSSIAN_CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Новосибирск',
  'Екатеринбург',
  'Казань',
  'Нижний Новгород',
  'Челябинск',
  'Самара',
  'Омск',
  'Ростов-на-Дону',
  'Уфа',
  'Красноярск',
  'Пермь',
  'Воронеж',
  'Волгоград',
];

export default function CatalogPage() {
  const navigate = useNavigate();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    maxArea: '',
    city: '',
  });
  const { objects, loading, error } = useObjects();

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const filteredObjects = objects.filter((obj) => {
    if (filters.type !== 'all' && obj.type !== filters.type) return false;
    if (filters.city && obj.city !== filters.city) return false;
    if (filters.minPrice && obj.price < Number(filters.minPrice)) return false;
    if (filters.maxPrice && obj.price > Number(filters.maxPrice)) return false;
    if (filters.minArea && obj.area < Number(filters.minArea)) return false;
    if (filters.maxArea && obj.area > Number(filters.maxArea)) return false;
    return true;
  });

  const resetFilters = () => {
    setFilters({
      type: 'all',
      minPrice: '',
      maxPrice: '',
      minArea: '',
      maxArea: '',
      city: '',
    });
  };

  const applyFilters = () => {
    setShowFilters(false);
  };

  const citiesList = RUSSIAN_CITIES;

  const typeLabels: Record<string, string> = {
    'Офис': 'Офис',
    'Склад': 'Склад',
    'Торговое помещение': 'Торговое помещение',
    'Другое': 'Другое',
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>GAB Invest</h1>
          <p className={styles.subtitle}>Маркетплейс недвижимости</p>
        </div>
        <button className={styles.filterBtn} onClick={() => setShowFilters(true)}>
          <Filter size={24} strokeWidth={2} />
        </button>
      </header>

      <div className={styles.filterChips}>
        <select
          className={styles.chip}
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="all">Тип</option>
          <option value="Офис">Офис</option>
          <option value="Склад">Склад</option>
          <option value="Торговое помещение">Торговое помещение</option>
          <option value="Другое">Другое</option>
        </select>
        <input
          className={styles.chip}
          placeholder="Цена"
          type="number"
          value={filters.minPrice}
          onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
        />
        <input
          className={styles.chip}
          placeholder="Площадь"
          type="number"
          value={filters.minArea}
          onChange={(e) => setFilters({ ...filters, minArea: e.target.value })}
        />
        <select
          className={styles.chip}
          value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })}
        >
          <option value="">Город</option>
          {RUSSIAN_CITIES.map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
        <button className={styles.resetBtn} onClick={resetFilters}>
          Сбросить
        </button>
      </div>

      <div className={styles.list}>
        {filteredObjects.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <LayoutGrid size={64} strokeWidth={1} color="#ccc" />
            </div>
            <p className={styles.emptyText}>Объекты не найдены</p>
            <button className={styles.emptyBtn} onClick={resetFilters}>
              Сбросить фильтры
            </button>
          </div>
        ) : (
          filteredObjects.map((obj) => (
            <div key={obj.id} className={styles.card} onClick={() => navigate(`/objects/${obj.id}`)}>
              <div className={styles.cardImage}>
                {obj.image ? (
                  <img
                    src={obj.image}
                    alt={obj.title}
                    className={styles.cardImg}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className={styles.placeholder}>
                    <LayoutGrid size={48} strokeWidth={1} color="#ccc" />
                  </div>
                )}
                <span className={styles.typeBadge}>{typeLabels[obj.type] || obj.type}</span>
                <button
                  className={styles.favoriteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(obj.id);
                  }}
                >
                  <Heart
                    size={20}
                    strokeWidth={2}
                    fill={favoriteIds.has(obj.id) ? '#000' : 'none'}
                  />
                </button>
              </div>
              <div className={styles.cardBody}>
                <h3 className={styles.cardTitle}>{obj.title}</h3>
                <p className={styles.cardLocation}>
                  <MapPin size={12} strokeWidth={2} />
                  {obj.location}
                </p>
                <div className={styles.cardFooter}>
                  <span className={styles.price}>{obj.price.toLocaleString('ru-RU')} ₽</span>
                  <span className={styles.yield}>Доходность: {obj.yieldPercent}%</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showFilters && (
        <div className={styles.filterOverlay}>
          <div className={styles.filterModal}>
            <div className={styles.filterHeader}>
              <h2>Фильтры</h2>
              <button className={styles.closeBtn} onClick={() => setShowFilters(false)}>
                <X size={24} strokeWidth={2} />
              </button>
            </div>

            <div className={styles.filterBody}>
              <div className={styles.filterSection}>
                <h3 className={styles.filterSectionTitle}>Тип объекта</h3>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={filters.type === 'Офис'}
                    onChange={(e) => setFilters({ ...filters, type: e.target.checked ? 'Офис' : 'all' })}
                  />
                  <span>Офис</span>
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={filters.type === 'Склад'}
                    onChange={(e) => setFilters({ ...filters, type: e.target.checked ? 'Склад' : 'all' })}
                  />
                  <span>Склад</span>
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={filters.type === 'Торговое помещение'}
                    onChange={(e) => setFilters({ ...filters, type: e.target.checked ? 'Торговое помещение' : 'all' })}
                  />
                  <span>Торговое помещение</span>
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={filters.type === 'Другое'}
                    onChange={(e) => setFilters({ ...filters, type: e.target.checked ? 'Другое' : 'all' })}
                  />
                  <span>Другое</span>
                </label>
              </div>

              <div className={styles.filterSection}>
                <h3 className={styles.filterSectionTitle}>Цена, ₽</h3>
                <div className={styles.filterRow}>
                  <input
                    className={styles.filterInput}
                    placeholder="От, ₽"
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  />
                  <input
                    className={styles.filterInput}
                    placeholder="До, ₽"
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.filterSection}>
                <h3 className={styles.filterSectionTitle}>Площадь, м²</h3>
                <div className={styles.filterRow}>
                  <input
                    className={styles.filterInput}
                    placeholder="От, м²"
                    type="number"
                    value={filters.minArea}
                    onChange={(e) => setFilters({ ...filters, minArea: e.target.value })}
                  />
                  <input
                    className={styles.filterInput}
                    placeholder="До, м²"
                    type="number"
                    value={filters.maxArea}
                    onChange={(e) => setFilters({ ...filters, maxArea: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.filterSection}>
                <h3 className={styles.filterSectionTitle}>Город</h3>
                <select
                  className={styles.filterSelect}
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                >
                  <option value="">Выберите город</option>
                  {citiesList.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.filterFooter}>
              <button className={styles.resetFilterBtn} onClick={resetFilters}>
                Сбросить
              </button>
              <button className={styles.applyFilterBtn} onClick={applyFilters}>
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
