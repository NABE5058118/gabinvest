export function normalizeOfferFileName(name: string): string {
  if (!name) {
    return 'offer.pdf';
  }
  const decoded = name.includes('Ð')
    ? Buffer.from(name, 'latin1').toString('utf-8')
    : name;
  return decoded
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .slice(0, 200) || 'offer.pdf';
}
