import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, ChevronDown, Download } from 'lucide-react';
import { ObjectType } from '@utils/types';
import { api } from '@utils/api';
import { adminApi } from '@utils/adminApi';
import styles from '@styles/OfferPage.module.css';

  function ExpandableSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={styles.section}>
      <button
        className={styles.sectionHeader}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
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
  const [object, setObject] = useState<ObjectType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const offer = (object.commercialOffer?.content || {}) as any;

  const handleDownload = async () => {
    if (!object.offerFileUrl || !id) return;
    try {
      const { data } = await adminApi.get(`/api/admin/objects/${id}/offer/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = object.offerFileName || 'offer.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Ошибка скачивания');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(`/objects/${id}`)} aria-label="Назад">
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

        {object.offerFileUrl ? (
          <button className={styles.primaryBtn} onClick={handleDownload}>
            <Download size={18} strokeWidth={2} style={{ marginRight: 8 }} />
            Скачать КП ({object.offerFileName || 'PDF/PPTX'})
          </button>
        ) : (
      <div className={styles.emptyState} role="status">Коммерческое предложение ещё не загружено</div>
        )}

        {!object.offerFileUrl && Object.keys(offer).length > 0 && (
          <>
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
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(offer.арендный_бизнес.якорные_арендаторы as any).map((tenant: { название: string; площадь: string; срок_договора: string }, idx: number) => (
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
          </>
        )}

        <button className={styles.primaryBtn} onClick={() => navigate(`/objects/${id}/lead`)}>
          Оставить заявку
        </button>
      </div>
    </div>
  );
}
