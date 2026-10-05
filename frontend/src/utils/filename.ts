export function normalizeOfferFileName(name: string): string {
  if (!name) {
    return 'offer.pdf';
  }
  const decoded = name.includes('Ð')
    ? decodeURIComponent(escape(name))
    : name;
  return decoded
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .slice(0, 200) || 'offer.pdf';
}
