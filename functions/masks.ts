export function formatCNPJ(value: string) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 14);
  if (!digits) return "";
  return digits.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    "$1.$2.$3/$4-$5",
  );
}

export function formatBirthDate(value: string) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 8);

  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatEmail(value: string) {
  return (value || "").trim().toLowerCase();
}
