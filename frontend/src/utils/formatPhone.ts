export function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '').replace(/^[78]/, '').slice(0, 10);

  if (!numbers) return '+7';

  const p1 = numbers.slice(0, 3);
  const p2 = numbers.slice(3, 6);
  const p3 = numbers.slice(6, 8);
  const p4 = numbers.slice(8, 10);

  let result = '+7';
  if (p1) result += ` (${p1}`;
  if (p1.length === 3) result += ')';
  if (p2) result += ` ${p2}`;
  if (p3) result += `-${p3}`;
  if (p4) result += `-${p4}`;

  return result;
}
