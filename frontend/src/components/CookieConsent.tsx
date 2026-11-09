import { useState } from 'react';
import styles from './CookieConsent.module.css';

type Consent = {
  necessary: boolean;
  analytics: boolean;
};

const STORAGE_KEY = 'gab_cookie_consent';
const DEFAULT_CONSENT: Consent = { necessary: true, analytics: false };

export default function CookieConsent() {
  const [open, setOpen] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return !raw;
    } catch {
      return true;
    }
  });

  const [consent, setConsent] = useState<Consent>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_CONSENT;
      const parsed = JSON.parse(raw) as Consent;
      return parsed && typeof parsed === 'object' ? parsed : DEFAULT_CONSENT;
    } catch {
      return DEFAULT_CONSENT;
    }
  });

  const toggle = (key: keyof Consent) => {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const accept = (next: Consent) => {
    setConsent(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    setOpen(false);
  };

  const acceptAll = () => accept({ necessary: true, analytics: true });
  const acceptNecessary = () => accept({ necessary: true, analytics: false });

  if (!open) return null;

  return (
    <div className={styles.banner} role="dialog" aria-modal="true" aria-label="Файлы cookie">
      <div className={styles.content}>
        <div className={styles.text}>
          Мы используем файлы cookie для работы сайта.
          Выберите, какие категории файлов cookie разрешить.
        </div>
        <div className={styles.row}>
          <div className={styles.item}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={consent.necessary}
                readOnly
                aria-label="Необходимые cookie"
              />
              Необходимые
            </label>
          </div>
          <div className={styles.item}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={consent.analytics}
                onChange={() => toggle('analytics')}
                aria-label="Все"
              />
              Все
            </label>
          </div>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.btn} onClick={acceptNecessary}>
            Только необходимые
          </button>
          <button type="button" className={styles.btnPrimary} onClick={acceptAll}>
            Принять все
          </button>
        </div>
      </div>
    </div>
  );
}
