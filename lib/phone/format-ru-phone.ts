/** Маска +7 (900) 123-45-67 для российских номеров. */
export function formatRuPhone(value: string): string {
  let cleaned = value.replace(/[^\d+]/g, '');

  if (cleaned.length === 0) {
    return '';
  }

  if (cleaned.startsWith('8')) {
    cleaned = '+7' + cleaned.slice(1);
  } else if (cleaned.startsWith('7') && !cleaned.startsWith('+7')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+7') && !cleaned.startsWith('+')) {
    cleaned = '+7' + cleaned;
  } else if (cleaned.startsWith('+') && !cleaned.startsWith('+7')) {
    cleaned = '+7' + cleaned.slice(1);
  }

  cleaned = cleaned.slice(0, 13);

  if (cleaned.length <= 2) {
    return cleaned;
  }

  const digits = cleaned.slice(2).replace(/\D/g, '');
  let formatted = '+7';

  if (digits.length > 0) {
    formatted += ' (' + digits.slice(0, 3);
  }
  if (digits.length >= 4) {
    formatted += ') ' + digits.slice(3, 6);
  }
  if (digits.length >= 7) {
    formatted += '-' + digits.slice(6, 8);
  }
  if (digits.length >= 9) {
    formatted += '-' + digits.slice(8, 10);
  }

  return formatted;
}

export function normalizeProfilePhoneForForm(
  phone: string | null | undefined
): string | null {
  if (!phone || !String(phone).trim()) return null;
  const formatted = formatRuPhone(String(phone).trim());
  const digits = formatted.replace(/\D/g, '');
  if (digits.length < 11) return formatted || null;
  return formatted;
}
