import QRCode from 'qrcode';

export type PaymentQrInput = {
  payment_ref: string;
  tour_id: string;
  amount: number;
  created_at: string;
  booking_id?: string;
  tour_title?: string;
};

/** Уникальный payload для демо-оплаты по QR (без реального эквайринга). */
export function buildPaymentQrPayload(input: PaymentQrInput): string {
  return JSON.stringify({
    type: 'tatarstan-tour-payment',
    mode: 'demo',
    currency: 'RUB',
    payment_ref: input.payment_ref,
    booking_id: input.booking_id ?? null,
    tour_id: input.tour_id,
    tour_title: input.tour_title ?? null,
    amount: input.amount,
    created_at: input.created_at,
  });
}

export async function paymentQrToDataUrl(payloadJson: string): Promise<string> {
  return QRCode.toDataURL(payloadJson, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#065f46',
      light: '#ffffff',
    },
  });
}

export async function createPaymentQrDataUrl(input: PaymentQrInput): Promise<string> {
  return paymentQrToDataUrl(buildPaymentQrPayload(input));
}
