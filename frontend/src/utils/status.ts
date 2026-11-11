export type StatusVariant = 'moderation' | 'lead';

export type StatusOption = { value: string; label: string };

export const MODERATION_STATUSES: StatusOption[] = [
  { value: 'pending', label: 'На проверке' },
  { value: 'approved', label: 'Одобрено' },
  { value: 'rejected', label: 'Отклонено' },
];

export const LEAD_STATUSES: StatusOption[] = [
  { value: 'new', label: 'Новая' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'done', label: 'Завершена' },
  { value: 'cancelled', label: 'Отменена' },
];

export const statusOptions = (variant: StatusVariant): StatusOption[] =>
  variant === 'moderation' ? MODERATION_STATUSES : LEAD_STATUSES;

export const statusLabel = (variant: StatusVariant, value: string): string => {
  const option = statusOptions(variant).find((o) => o.value === value);
  return option ? option.label : value;
};

export const statusRank = (variant: StatusVariant, value: string): number =>
  statusOptions(variant).findIndex((o) => o.value === value);

export const sortByStatus = <T extends { status: string }>(
  items: T[],
  variant: StatusVariant,
  dir: 'asc' | 'desc' = 'asc',
): T[] => {
  const order = statusOptions(variant);
  const ranked = [...items].sort((a, b) => {
    const ra = order.findIndex((o) => o.value === a.status);
    const rb = order.findIndex((o) => o.value === b.status);
    const ca = ra === -1 ? order.length : ra;
    const cb = rb === -1 ? order.length : rb;
    if (ca !== cb) return dir === 'asc' ? ca - cb : cb - ca;
    return (a.status || '').localeCompare(b.status || '');
  });
  return ranked;
};
