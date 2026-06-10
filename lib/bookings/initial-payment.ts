/** Начальный статус оплаты при создании брони (не помечаем cash/qr как оплаченные). */
export function initialPaymentStatus(paymentMethod: string): 'pending' | 'paid' {
  if (paymentMethod === 'card') return 'paid';
  return 'pending';
}

/** Статус брони при создании: подтверждён только после оплаты картой (демо-шлюз). */
export function initialBookingStatus(paymentMethod: string): 'pending' | 'confirmed' {
  if (paymentMethod === 'card') return 'confirmed';
  return 'pending';
}
