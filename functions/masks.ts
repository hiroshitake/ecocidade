export function formatCNPJ(value: string) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 14);
  if (!digits) return '';
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatBirthDate(value: string) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';
  return digits.replace(/(\d{2})(\d{2})(\d{4})/, '$1/$2/$3');
}

export function formatEmail(value: string) {
  return (value || '').trim().toLowerCase();
}
