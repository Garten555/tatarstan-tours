/** Уникальный ref оплаты; работает и по HTTP (без secure context для crypto.randomUUID). */
export function generatePaymentRef(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      /* insecure context (http://) */
    }
  }
  return `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
