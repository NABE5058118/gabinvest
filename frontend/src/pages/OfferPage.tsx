import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mockObjects } from '../utils/mockData';
import { ArrowLeft, MapPin, ChevronDown } from 'lucide-react';
import styles from './OfferPage.module.css';

function ExpandableSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={styles.section}>
      <button className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)}>
        <span className={styles.sectionTitle}>{title}</span>
        <ChevronDown
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          size={20}
          strokeWidth={2}
        />
      </button>
      {isOpen && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

export default function OfferPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Объект не найден</div>
      </div>
    );
  }

  const object = mockObjects.find((o) => o.id === id);

  if (!object) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>Объект не найден</div>
      </div>
    );
  }

  const offer = (object.commercialOffer?.content || {}) as Record<string, any>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(`/objects/${id}`)}>
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <h1 className={styles.headerTitle}>Коммерческое предложение</h1>
      </header>

      <div className={styles.content}>
        <div className={styles.objectHeader}>
          <div className={styles.objectTitle}>{object.title}</div>
          <div className={styles.objectLocation}>
            <MapPin size={14} strokeWidth={2} />
            {object.location}
          </div>
        </div>

        {offer.паспорт_объекта && (
          <ExpandableSection title="Паспорт объекта" defaultOpen>
            {Object.entries(offer.паспорт_объекта).map(([key, value]) => (
              <div key={key} className={styles.row}>
                <span className={styles.label}>{key}</span>
                <span className={styles.value}>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </ExpandableSection>
        )}

        {offer.арендный_бизнес && (
          <ExpandableSection title="Арендный бизнес" defaultOpen>
            {offer.арендный_бизнес.якорные_арендаторы && (
              <div className={styles.subsection}>
                <h3 className={styles.subsectionTitle}>Якорные арендаторы</h3>
                {offer.арендный_бизнес.якорные_арендаторы.map((tenant: any, idx: number) => (
                  <div key={idx} className={styles.tenantRow}>
                    <span className={styles.tenantName}>{tenant.название}</span>
                    <span className={styles.tenantValue}>{tenant.площадь} м² • {tenant.срок_договора}</span>
                  </div>
                ))}
              </div>
            )}
            {Object.entries(offer.арендный_бизнес).map(([key, value]) => {
              if (key === 'якорные_арендаторы') return null;
              return (
                <div key={key} className={styles.row}>
                  <span className={styles.label}>{key}</span>
                  <span className={styles.value}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                </div>
              );
            })}
          </ExpandableSection>
        )}

        {offer.условия_сделки && (
          <ExpandableSection title="Условия сделки">
            {Object.entries(offer.условия_сделки).map(([key, value]) => (
              <div key={key} className={styles.row}>
                <span className={styles.label}>{key}</span>
                <span className={styles.value}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
              </div>
            ))}
          </ExpandableSection>
        )}

        {offer.техническое_состояние && (
          <ExpandableSection title="Техническое состояние">
            {Object.entries(offer.техническое_состояние).map(([key, value]) => (
              <div key={key} className={styles.row}>
                <span className={styles.label}>{key}</span>
                <span className={styles.value}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
              </div>
            ))}
          </ExpandableSection>
        )}

        {offer.контакты && (
          <ExpandableSection title="Контакты">
            {Object.entries(offer.контакты).map(([key, value]) => (
              <div key={key} className={styles.row}>
                <span className={styles.label}>{key}</span>
                <span className={styles.value}>{String(value)}</span>
              </div>
            ))}
          </ExpandableSection>
        )}

        <button className={styles.primaryBtn} onClick={() => navigate(`/objects/${id}/lead`)}>
          Оставить заявку
        </button>
      </div>
    </div>
  );
}
