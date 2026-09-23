import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MapPin, LayoutGrid, Users, Calendar, FileText, Wrench, Percent, TrendingUp, Landmark } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { ObjectType } from '../utils/types';
import { api } from '../utils/api';
import styles from './ObjectPage.module.css';

export default function ObjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [object, setObject] = useState<ObjectType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { favoriteIds, toggleFavorite } = useFavorites();

  useEffect(() => {
    if (!id) return;
    api
      .get<ObjectType>(`/api/objects/${id}`)
      .then((res) => setObject(res.data))
      .catch(() => setError('Объект не найден'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Загрузка...</div>
      </div>
    );
  }

  if (error || !object) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error || 'Объект не найден'}</div>
      </div>
    );
  }

  const isFav = favoriteIds.has(object.id);
  const mainImage = object.images && object.images.length > 0 ? object.images[0].url : object.image;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('ru-RU');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return null;
    return `${amount.toLocaleString('ru-RU')} ₽`;
  };

  const priceIndicatorLabels: Record<string, string> = {
    'below_market': 'Ниже рынка',
    'market': 'По рынку',
    'above_market': 'Выше рынка',
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <button
          className={styles.favoriteBtn}
          onClick={() => toggleFavorite(object.id)}
        >
          <Heart size={24} strokeWidth={2} fill={isFav ? '#000' : 'none'} />
        </button>
      </header>

      <div className={styles.image}>
        {mainImage ? (
          <img
            src={mainImage}
            alt={object.title}
            className={styles.objectImg}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className={styles.placeholder}>
            <LayoutGrid size={64} strokeWidth={1} color="#ccc" />
          </div>
        )}
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>{object.title}</h1>
        <p className={styles.location}>
          <MapPin size={14} strokeWidth={2} />
          {object.location}
        </p>

        <div className={styles.priceRow}>
          <div className={styles.price}>{object.price.toLocaleString('ru-RU')} ₽</div>
          <div className={styles.yield}>Доходность: {object.yieldPercent}%</div>
          {object.priceIndicator && priceIndicatorLabels[object.priceIndicator] && (
            <div className={`${styles.priceIndicator} ${styles[object.priceIndicator]}`}>
              {priceIndicatorLabels[object.priceIndicator]}
            </div>
          )}
        </div>

        <div className={styles.badges}>
          <span className={styles.badge}>{object.type}</span>
          <span className={styles.badge}>Площадь: {object.area} м²</span>
          {object.monthlyRent && (
            <span className={styles.badge}>Арендный поток: {formatCurrency(object.monthlyRent)}/мес</span>
          )}
          {object.annualRevenue && (
            <span className={styles.badge}>Годовая выручка: {formatCurrency(object.annualRevenue)}</span>
          )}
          {object.leaseEndDate && (
            <span className={styles.badge}>Окончание договора: {formatDate(object.leaseEndDate)}</span>
          )}
        </div>

        {object.anchorTenantName && (
          <div className={styles.anchorTenantSection}>
            <h3><Users size={16} strokeWidth={2} /> Арендаторы</h3>
            <div className={styles.anchorTenant}>
              Якорный арендатор: <strong>{object.anchorTenantName}</strong>
            </div>
          </div>
        )}

        {object.tenants && object.tenants.length > 0 && (
          <div className={styles.section}>
            <h3><Users size={16} strokeWidth={2} /> Арендаторы ({object.tenants.length})</h3>
            <div className={styles.tenantList}>
              {object.tenants.map((tenant) => (
                <div key={tenant.id} className={styles.tenantItem}>
                  <span className={styles.tenantName}>{tenant.name}</span>
                  {tenant.isAnchor && <span className={styles.anchorBadge}>Якорный</span>}
                  {tenant.category && <span className={styles.tenantCategory}>{tenant.category}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {object.leases && object.leases.length > 0 && (
          <div className={styles.section}>
            <h3><Calendar size={16} strokeWidth={2} /> Договоры аренды</h3>
            <div className={styles.leaseList}>
              {object.leases.map((lease) => (
                <div key={lease.id} className={styles.leaseItem}>
                  <div className={styles.leaseTenant}>{lease.tenant.name}</div>
                  <div className={styles.leaseDates}>
                    {formatDate(lease.startDate)} — {formatDate(lease.endDate)}
                  </div>
                  <div className={styles.leaseRent}>
                    {formatCurrency(lease.monthlyRent)}/мес
                    {!lease.isFixed && lease.percentOfTurnover && (
                      <span className={styles.leasePercent}> + {lease.percentOfTurnover}% от товарооборота</span>
                    )}
                  </div>
                  {lease.indexationPercent && (
                    <div className={styles.leaseIndexation}>
                      Индексация: +{lease.indexationPercent}% в год
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {object.expenses && object.expenses.length > 0 && (
          <div className={styles.section}>
            <h3><TrendingUp size={16} strokeWidth={2} /> Расходы</h3>
            <div className={styles.expenseList}>
              {object.expenses.map((expense) => (
                <div key={expense.id} className={styles.expenseItem}>
                  <span className={styles.expenseName}>{expense.name}</span>
                  <span className={styles.expenseAmount}>{formatCurrency(expense.amount)}</span>
                  <div className={styles.expenseTags}>
                    {expense.compensatedByTenant && (
                      <span className={styles.expenseTag}>Компенсируется арендатором</span>
                    )}
                    {expense.ownerOnly && (
                      <span className={`${styles.expenseTag} ${styles.ownerExpense}`}>На собственнике</span>
                    )}
                  </div>
                  {expense.note && <div className={styles.expenseNote}>{expense.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {object.legalConstraints && object.legalConstraints.length > 0 && (
          <div className={styles.section}>
            <h3><FileText size={16} strokeWidth={2} /> Юридические нюансы</h3>
            <div className={styles.constraintList}>
              {object.legalConstraints.map((constraint) => (
                <div key={constraint.id} className={styles.constraintItem}>
                  <span className={styles.constraintType}>{constraint.type}</span>
                  <p className={styles.constraintDesc}>{constraint.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {object.engineeringSpec && (
          <div className={styles.section}>
            <h3><Wrench size={16} strokeWidth={2} /> Инженерные мощности</h3>
            <div className={styles.engineeringGrid}>
              {object.engineeringSpec.electricityKw && (
                <div className={styles.engineeringItem}>
                  <span className={styles.engineeringLabel}>Электричество</span>
                  <span className={styles.engineeringValue}>{object.engineeringSpec.electricityKw} кВт</span>
                </div>
              )}
              {object.engineeringSpec.waterParams && (
                <div className={styles.engineeringItem}>
                  <span className={styles.engineeringLabel}>Вода</span>
                  <span className={styles.engineeringValue}>{object.engineeringSpec.waterParams}</span>
                </div>
              )}
              {object.engineeringSpec.gasParams && (
                <div className={styles.engineeringItem}>
                  <span className={styles.engineeringLabel}>Газ</span>
                  <span className={styles.engineeringValue}>{object.engineeringSpec.gasParams} (отопление)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {object.vatRate && (
          <div className={styles.section}>
            <h3><Percent size={16} strokeWidth={2} /> НДС</h3>
            <div className={styles.vatInfo}>
              <span className={styles.vatRate}>НДС {object.vatRate.rate}%</span>
              {object.vatRate.note && <span className={styles.vatNote}>{object.vatRate.note}</span>}
            </div>
          </div>
        )}

        {object.placement && (
          <div className={styles.section}>
            <h3><Landmark size={16} strokeWidth={2} /> Размещение</h3>
            <div className={styles.placementInfo}>
              <span className={styles.placementType}>
                {object.placement.type === 'exclusive' ? 'Эксклюзив' : object.placement.type === 'paid' ? 'Платное' : 'Стандартное'}
              </span>
              {object.placement.price && (
                <span className={styles.placementPrice}>{formatCurrency(object.placement.price)}</span>
              )}
              {object.placement.isExclusive && (
                <span className={styles.exclusiveBadge}>Эксклюзивное размещение</span>
              )}
            </div>
          </div>
        )}

        {object.description && (
          <div className={styles.description}>
            <h2>Описание</h2>
            <p>{object.description}</p>
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={() => navigate(`/objects/${id}/offer`)}>
            Коммерческое предложение
          </button>
          <button className={styles.secondaryBtn} onClick={() => navigate(`/objects/${id}/lead`)}>
            Оставить заявку
          </button>
          <button className={styles.managerLink} onClick={() => navigate(`/objects/${id}/lead`)}>
            Связаться с менеджером
          </button>
        </div>
      </div>
    </div>
  );
}