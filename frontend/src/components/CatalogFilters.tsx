import { X } from 'lucide-react';
import { CITIES, OBJECT_TYPES } from '../data/cities';

type SortOption = 'createdAt' | 'price' | 'area' | 'yieldPercent' | 'leaseEndDate';

export type Filters = {
  type: string;
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
  applyFilters: () => void;
  sortLabels: Record<SortOption, string>;
};

export default function CatalogFilters({
  styles,
  filters,
  setFilters,
  showFilters,
  setShowFilters,
  resetFilters,
  applyFilters,
  sortLabels,
}: CatalogFiltersProps) {
  return (
    <>
      <div className={styles.sortBar}>
        <select
          className={styles.sortSelect}
          value={`${filters.sortBy}-${filters.sortOrder}`}
          onChange={(e) => {
            const [sortBy, sortOrder] = e.target.value.split('-');
            setFilters({
              ...filters,
              sortBy: sortBy as SortOption,
              sortOrder: sortOrder as 'asc' | 'desc',
            });
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
          onClick={() =>
            setFilters({
              ...filters,
              sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
            })
          }
          aria-label={
            filters.sortOrder === 'asc'
              ? 'Порядок сортировки: по возрастанию'
              : 'Порядок сортировки: по убыванию'
          }
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
          {OBJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
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
          {CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        <button className={styles.resetBtn} onClick={resetFilters}>
          Сбросить
        </button>
      </div>

      <div className={`${styles.filterOverlay} ${showFilters ? styles.open : ''}`}>
        <div className={styles.filterModal}>
          <div className={styles.filterHeader}>
            <h2>Фильтры</h2>
            <button
              className={styles.closeBtn}
              onClick={() => setShowFilters(false)}
              aria-label="Закрыть фильтры"
            >
              <X size={24} strokeWidth={2} />
            </button>
          </div>

          <div className={styles.filterBody}>
            <div className={styles.filterSection}>
              <h3 className={styles.filterSectionTitle}>Тип объекта</h3>
              {OBJECT_TYPES.map((type) => (
                <label key={type} className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={filters.type === type}
                    onChange={(e) =>
                      setFilters({ ...filters, type: e.target.checked ? type : 'all' })
                    }
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>

            <div className={styles.filterSection}>
              <h3 className={styles.filterSectionTitle}>Цена, ₽</h3>
              <div className={styles.filterRow}>
                <input
                  className={styles.filterInput}
                  placeholder="От, ₽"
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) =>
                    setFilters({ ...filters, minPrice: e.target.value })
                  }
                />
                <input
                  className={styles.filterInput}
                  placeholder="До, ₽"
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
                  placeholder="От, %"
                  type="number"
                  step="0.1"
                  value={filters.minYield}
                  onChange={(e) =>
                    setFilters({ ...filters, minYield: e.target.value })
                  }
                />
                <input
                  className={styles.filterInput}
                  placeholder="До, %"
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
                  placeholder="От, м²"
                  type="number"
                  value={filters.minArea}
                  onChange={(e) =>
                    setFilters({ ...filters, minArea: e.target.value })
                  }
                />
                <input
                  className={styles.filterInput}
                  placeholder="До, м²"
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
            <button className={styles.applyFilterBtn} onClick={applyFilters}>
              Применить
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
