export type CardBrand = 'visa' | 'mastercard' | 'mir';

export const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  mir: 'МИР',
};

export function normalizeCardNumber(value: string): string {
  return value.replace(/\D/g, '');
}

export function luhnCheck(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/** Поддерживаем только Visa, Mastercard и МИР. */
export function detectCardBrand(digits: string): CardBrand | null {
  if (/^220[0-4]\d{12}$/.test(digits)) return 'mir';
  if (/^4\d{12,18}$/.test(digits)) return 'visa';
  if (/^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/.test(digits)) {
    return 'mastercard';
  }
  return null;
}

export function formatCardNumberInput(digits: string): string {
  return normalizeCardNumber(digits)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

export function validateCardExpiry(expiry: string): string | null {
  const trimmed = expiry.trim();
  if (!/^\d{2}\/\d{2}$/.test(trimmed)) {
    return 'Срок действия: формат MM/YY';
  }
  const [mmRaw, yyRaw] = trimmed.split('/');
  const month = Number(mmRaw);
  const year = 2000 + Number(yyRaw);
  if (month < 1 || month > 12) {
    return 'Некорректный месяц карты';
  }
  const now = new Date();
  const expiryEnd = new Date(year, month, 0, 23, 59, 59, 999);
  if (expiryEnd < now) {
    return 'Срок действия карты истёк';
  }
  return null;
}

export function validateCvv(cvv: string, brand: CardBrand): string | null {
  const digits = cvv.replace(/\D/g, '');
  if (brand === 'visa' || brand === 'mastercard' || brand === 'mir') {
    if (!/^\d{3}$/.test(digits)) return 'CVV: 3 цифры';
    return null;
  }
  return 'CVV: 3 цифры';
}

export function validateCardholderName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 3) return 'Укажите имя держателя карты';
  if (!/^[a-zA-Zа-яА-ЯёЁ\s.-]+$/.test(trimmed)) {
    return 'Имя держателя: только буквы';
  }
  return null;
}

export type CardPaymentInput = {
  number: string;
  expiry: string;
  cvv: string;
  cardholderName: string;
};

export type CardValidationResult = {
  ok: boolean;
  brand: CardBrand | null;
  lastFour: string;
  errors: string[];
};

export function validateCardPaymentInput(input: CardPaymentInput): CardValidationResult {
  const digits = normalizeCardNumber(input.number);
  const errors: string[] = [];

  if (!digits) {
    errors.push('Введите номер карты');
  } else {
    const brand = detectCardBrand(digits);
    if (!brand) {
      errors.push('Поддерживаются только карты Visa, Mastercard и МИР');
    } else if (!luhnCheck(digits)) {
      errors.push('Некорректный номер карты');
    }

    const expiryError = validateCardExpiry(input.expiry);
    if (expiryError) errors.push(expiryError);

    if (brand) {
      const cvvError = validateCvv(input.cvv, brand);
      if (cvvError) errors.push(cvvError);
    }

    const nameError = validateCardholderName(input.cardholderName);
    if (nameError) errors.push(nameError);

    const brandFinal = detectCardBrand(digits);
    return {
      ok: errors.length === 0 && brandFinal !== null,
      brand: brandFinal,
      lastFour: digits.slice(-4),
      errors,
    };
  }

  const expiryError = validateCardExpiry(input.expiry);
  if (expiryError) errors.push(expiryError);
  const nameError = validateCardholderName(input.cardholderName);
  if (nameError) errors.push(nameError);
  if (!input.cvv.trim()) errors.push('CVV: 3 цифры');

  return { ok: false, brand: null, lastFour: digits.slice(-4), errors };
}

/** Данные для payment_data — без PAN и CVV. */
export function buildSafeCardPaymentMeta(
  input: CardPaymentInput,
  validation: CardValidationResult
): { card_type: CardBrand; last_four_digits: string; cardholder_name: string } | null {
  if (!validation.ok || !validation.brand) return null;
  return {
    card_type: validation.brand,
    last_four_digits: validation.lastFour,
    cardholder_name: input.cardholderName.trim(),
  };
}
