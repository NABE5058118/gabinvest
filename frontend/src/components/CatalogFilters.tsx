import { X } from 'lucide-react';
import { CITIES, OBJECT_TYPES } from '../data/cities';

type SortOption = 'createdAt' | 'price' | 'area' | 'yieldPercent' | 'leaseEndDate';

export type Filters = {
  types: string[];
  minPrice: string;
  maxPrice: string;
  minArea: string;
  maxArea: string;
  city: string;
  anchorTenant: string;
  sortBy: SortOption;
  sortOrder: 'asc' | 'desc';
  minYield: string;
  maxYield: string;
  leaseEndBefore: string;
  leaseEndAfter: string;
};

type CatalogFiltersProps = {
  styles: Record<string, string>;
  filters: Filters;
  setFilters: (filters: Filters) => void;
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  resetFilters: () => void;
  applyFilters?: () => void;
};

export default function CatalogFilters({
  styles,
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  resetFilters,
  applyFilters,
}: CatalogFiltersProps) {
  const toggleType = (type: string) => {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    setFilters({ ...filters, types: next });
  };

  return (
    <div className={`${styles.filterOverlay} ${showFilters ? styles.open : ''}`}>
      <div className={styles.filterModal}>
        <div className={styles.filterHeader}>
          <h2>Фильтры</h2>
          <button
            className={styles.closeBtn}
            onClick={() => setShowFilters(false)}
            aria-label="Закрыть фильтры"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        <div className={styles.filterBody}>
          <div className={styles.filterSection}>
            <h3 className={styles.filterSectionTitle}>Тип объекта</h3>
            {filters.types.length > 0 && (
              <div className={styles.activeChips}>
                {filters.types.map((t) => (
                  <span key={t} className={styles.activeChip} onClick={() => toggleType(t)}>
                    {t} <X size={12} />
                  </span>
                ))}
              </div>
            )}
            <div className={styles.checkboxGroup}>
              {OBJECT_TYPES.map((type) => (
                <label key={type} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={filters.types.includes(type)}
                    onChange={() => toggleType(type)}
                  />
                  <span className={styles.checkboxLabel}>{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <h3 className={styles.filterSectionTitle}>Цена, ₽</h3>
            <div className={styles.filterRow}>
              <input
                className={styles.filterInput}
                placeholder="От"
                type="number"
                value={filters.minPrice}
                onChange={(e) =>
                  setFilters({ ...filters, minPrice: e.target.value })
                }
              />
              <input
                className={styles.filterInput}
                placeholder="До"
                type="number"
                value={filters.maxPrice}
                onChange={(e) =>
                  setFilters({ ...filters, maxPrice: e.target.value })
                }
              />
            </div>
          </div>

          <div className={styles.filterSection}>
            <h3 className={styles.filterSectionTitle}>Доходность, %</h3>
            <div className={styles.filterRow}>
              <input
                className={styles.filterInput}
                placeholder="От"
                type="number"
                step="0.1"
                value={filters.minYield}
                onChange={(e) =>
                  setFilters({ ...filters, minYield: e.target.value })
                }
              />
              <input
                className={styles.filterInput}
                placeholder="До"
                type="number"
                step="0.1"
                value={filters.maxYield}
                onChange={(e) =>
                  setFilters({ ...filters, maxYield: e.target.value })
                }
              />
            </div>
          </div>

          <div className={styles.filterSection}>
            <h3 className={styles.filterSectionTitle}>Площадь, м²</h3>
            <div className={styles.filterRow}>
              <input
                className={styles.filterInput}
                placeholder="От"
                type="number"
                value={filters.minArea}
                onChange={(e) =>
                  setFilters({ ...filters, minArea: e.target.value })
                }
              />
              <input
                className={styles.filterInput}
                placeholder="До"
                type="number"
                value={filters.maxArea}
                onChange={(e) =>
                  setFilters({ ...filters, maxArea: e.target.value })
                }
              />
            </div>
          </div>

          <div className={styles.filterSection}>
            <h3 className={styles.filterSectionTitle}>Сроки договора</h3>
            <div className={styles.filterRow}>
              <input
                className={styles.filterInput}
                placeholder="От даты"
                type="date"
                value={filters.leaseEndAfter}
                onChange={(e) =>
                  setFilters({ ...filters, leaseEndAfter: e.target.value })
                }
              />
              <input
                className={styles.filterInput}
                placeholder="До даты"
                type="date"
                value={filters.leaseEndBefore}
                onChange={(e) =>
                  setFilters({ ...filters, leaseEndBefore: e.target.value })
                }
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
              onChange={(e) =>
                setFilters({ ...filters, anchorTenant: e.target.value })
              }
            />
          </div>

          <div className={styles.filterSection}>
            <h3 className={styles.filterSectionTitle}>Город</h3>
            <select
              className={styles.filterSelect}
              value={filters.city}
              onChange={(e) =>
                setFilters({ ...filters, city: e.target.value })
              }
            >
              <option value="">Выберите город</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.filterFooter}>
          <button className={styles.resetFilterBtn} onClick={resetFilters}>
            Сбросить
          </button>
          <button
            className={styles.applyFilterBtn}
            onClick={() => {
              if (applyFilters) applyFilters();
              else setShowFilters(false);
            }}
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
