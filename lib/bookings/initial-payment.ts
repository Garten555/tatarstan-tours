/** Начальный статус оплаты: «ожидает оплаты» только для наличных. */
export function initialPaymentStatus(paymentMethod: string): 'pending' | 'paid' {
  if (paymentMethod === 'cash') return 'pending';
  return 'paid';
}

/** Статус брони: pending только для наличных (оплата при встрече). */
export function initialBookingStatus(paymentMethod: string): 'pending' | 'confirmed' {
  if (paymentMethod === 'cash') return 'pending';
  return 'confirmed';
}
