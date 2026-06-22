/**
 * Máscaras e formatadores para campos de entrada
 */

/**
 * Formata texto para máscara CNPJ: 12.345.678/0001-90
 */
export const formatCNPJ = (text: string): string => {
  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
};

/**
 * Formata texto para máscara de data: DD/MM/YYYY
 */
export const formatBirthDate = (text: string): string => {
  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
};

/**
 * Formata email: remove espaços e converte para minúsculas
 */
export const formatEmail = (text: string): string => {
  return text.trim().toLowerCase();
};

/**
 * Formata telefone: (11) 99999-9999 ou (11) 3333-3333
 */
export const formatPhone = (text: string): string => {
  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 6) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  if (cleaned.length <= 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
};

/**
 * Formata CPF: 123.456.789-00
 */
export const formatCPF = (text: string): string => {
  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
};

/**
 * Remove todos os caracteres especiais (máscara)
 */
export const cleanMask = (text: string): string => {
  return text.replace(/\D/g, '');
};

/**
 * Valida se uma data em DD/MM/YYYY é válida
 */
export const isValidBirthDate = (text: string): boolean => {
  const parts = text.split('/');
  if (parts.length !== 3) return false;

  const [day, month, year] = parts.map(p => parseInt(p, 10));
  
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > new Date().getFullYear()) {
    return false;
  }

  // Validação simplificada (não considera anos bissextos perfeitamente)
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
};

/**
 * Valida CNPJ: estrutura básica (14 dígitos)
 */
export const isValidCNPJ = (text: string): boolean => {
  const cleaned = cleanMask(text);
  return cleaned.length === 14 && /^\d+$/.test(cleaned);
};

/**
 * Valida CPF: estrutura básica (11 dígitos)
 */
export const isValidCPF = (text: string): boolean => {
  const cleaned = cleanMask(text);
  return cleaned.length === 11 && /^\d+$/.test(cleaned);
};
