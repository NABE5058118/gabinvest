import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, X, Heart, MapPin, LayoutGrid, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

type SortOption = 'createdAt' | 'price' | 'area' | 'yieldPercent' | 'leaseEndDate';

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
    anchorTenant: '',
    sortBy: 'createdAt' as SortOption,
    sortOrder: 'desc' as 'asc' | 'desc',
    minYield: '',
    maxYield: '',
    leaseEndBefore: '',
    leaseEndAfter: '',
  });
  const [rotationKey, setRotationKey] = useState(0);
  const [lastRotation, setLastRotation] = useState<string | null>(null);
  const { objects, loading, error } = useObjects();

  const hasTelegram = typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;

  if (!hasTelegram) {
    return (
      <div className={styles.page}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <LayoutGrid size={64} strokeWidth={1} color="#ccc" />
          </div>
          <p className={styles.emptyText}>Откройте каталог через Telegram-бота</p>
          <p className={styles.emptyHint}>На текущий момент вход и регистрация работают только через Telegram.</p>
        </div>
      </div>
    );
  }

  const fetchObjectsWithRotation = useCallback(() => {
    setRotationKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchObjectsWithRotation();
      setLastRotation(new Date().toLocaleTimeString('ru-RU'));
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchObjectsWithRotation]);

  if (loading && rotationKey === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Загрузка...</div>
      </div>
    );
  }

  if (error && rotationKey === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const filteredObjects = objects.filter((obj) => {
    if (filters.type !== 'all' && obj.type !== filters.type) return false;
    if (filters.city && obj.city !== filters.city) return false;
    if (filters.anchorTenant) {
      const tenantMatch = obj.tenants?.some((t) =>
        t.name.toLowerCase().includes(filters.anchorTenant.toLowerCase())
      );
      if (!tenantMatch) return false;
    }
    if (filters.minPrice && obj.price < Number(filters.minPrice)) return false;
    if (filters.maxPrice && obj.price > Number(filters.maxPrice)) return false;
    if (filters.minArea && obj.area < Number(filters.minArea)) return false;
    if (filters.maxArea && obj.area > Number(filters.maxArea)) return false;
    if (filters.minYield && obj.yieldPercent < Number(filters.minYield)) return false;
    if (filters.maxYield && obj.yieldPercent > Number(filters.maxYield)) return false;
    if (filters.leaseEndBefore && obj.leaseEndDate && new Date(obj.leaseEndDate) > new Date(filters.leaseEndBefore)) return false;
    if (filters.leaseEndAfter && obj.leaseEndDate && new Date(obj.leaseEndDate) < new Date(filters.leaseEndAfter)) return false;
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
      anchorTenant: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      minYield: '',
      maxYield: '',
      leaseEndBefore: '',
      leaseEndAfter: '',
    });
  };

  const applyFilters = () => {
    setShowFilters(false);
  };

  const typeLabels: Record<string, string> = {
    'Офис': 'Офис',
    'Склад': 'Склад',
    'Торговое помещение': 'Торговое помещение',
    'Другое': 'Другое',
  };

  const priceIndicatorLabels: Record<string, { label: string; icon: typeof TrendingUp }> = {
    'above_market': { label: 'Выше рынка', icon: TrendingUp },
    'market': { label: 'По рынку', icon: Minus },
    'below_market': { label: 'Ниже рынка', icon: TrendingDown },
  };

  const sortLabels: Record<SortOption, string> = {
    createdAt: 'Новые',
    price: 'Цена',
    area: 'Площадь',
    yieldPercent: 'Доходность',
    leaseEndDate: 'Срок аренды',
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>GAB Invest</h1>
          <p className={styles.subtitle}>Маркетплейс недвижимости с арендным доходом</p>
          {lastRotation && (
            <p className={styles.rotationInfo}>Лента обновлена: {lastRotation}</p>
          )}
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} onClick={fetchObjectsWithRotation} title="Обновить ленту">
            <RefreshCw size={24} strokeWidth={2} />
          </button>
          <button className={styles.filterBtn} onClick={() => setShowFilters(true)}>
            <Filter size={24} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className={styles.sortBar}>
        <select
          className={styles.sortSelect}
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-');
            setFilters({ ...filters, sortBy: sortBy as SortOption, sortOrder: sortOrder as 'asc' | 'desc' });
          }}
        >
          {Object.entries(sortLabels).map(([value, label]) => (
            <option key={value} value={`${value}-${filters.sortOrder === 'asc' ? 'asc' : 'desc'}`}>
              {label}
            </option>
          ))}
        </select>
        <button
          className={styles.sortOrderBtn}
          onClick={() => setFilters({ ...filters, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
        >
          {filters.sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

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
          placeholder="Цена от"
          type="number"
          value={filters.minPrice}
          onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
        />
        <input
          className={styles.chip}
          placeholder="Площадь от"
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
                {obj.images && obj.images.length > 0 ? (
                  <img
                    src={obj.images[0].url}
                    alt={obj.title}
                    className={styles.cardImg}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : obj.image ? (
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
                {obj.priceIndicator && priceIndicatorLabels[obj.priceIndicator] && (
                  <span className={`${styles.priceIndicatorBadge} ${styles[obj.priceIndicator]}`}>
                    {(() => {
                      const Icon = priceIndicatorLabels[obj.priceIndicator].icon;
                      return <Icon size={12} strokeWidth={2} />;
                    })()}
                    {priceIndicatorLabels[obj.priceIndicator].label}
                  </span>
                )}
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
                {obj.anchorTenantName && (
                  <div className={styles.anchorTenant}>
                    Якорный арендатор: {obj.anchorTenantName}
                  </div>
                )}
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
                <h3 className={styles.filterSectionTitle}>Доходность, %</h3>
                <div className={styles.filterRow}>
                  <input
                    className={styles.filterInput}
                    placeholder="От, %"
                    type="number"
                    step="0.1"
                    value={filters.minYield}
                    onChange={(e) => setFilters({ ...filters, minYield: e.target.value })}
                  />
                  <input
                    className={styles.filterInput}
                    placeholder="До, %"
                    type="number"
                    step="0.1"
                    value={filters.maxYield}
                    onChange={(e) => setFilters({ ...filters, maxYield: e.target.value })}
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
                <h3 className={styles.filterSectionTitle}>Срок окончания договора</h3>
                <div className={styles.filterRow}>
                  <input
                    className={styles.filterInput}
                    placeholder="От даты"
                    type="date"
                    value={filters.leaseEndAfter}
                    onChange={(e) => setFilters({ ...filters, leaseEndAfter: e.target.value })}
                  />
                  <input
                    className={styles.filterInput}
                    placeholder="До даты"
                    type="date"
                    value={filters.leaseEndBefore}
                    onChange={(e) => setFilters({ ...filters, leaseEndBefore: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.filterSection}>
                <h3 className={styles.filterSectionTitle}>Якорный арендатор</h3>
                <input
                  className={styles.filterInput}
                  placeholder="Например, Пятёрочка"
                  type="text"
                  value={filters.anchorTenant}
                  onChange={(e) => setFilters({ ...filters, anchorTenant: e.target.value })}
                />
              </div>

              <div className={styles.filterSection}>
                <h3 className={styles.filterSectionTitle}>Город</h3>
                <select
                  className={styles.filterSelect}
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                >
                  <option value="">Выберите город</option>
                  {RUSSIAN_CITIES.map((city) => (
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