'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, QrCode } from 'lucide-react';
import { buildPaymentQrPayload } from '@/lib/payment/payment-qr';

type PaymentQrDisplayProps = {
  paymentRef: string;
  tourId: string;
  tourTitle?: string;
  amount: number;
  bookingId?: string;
  createdAt?: string;
  compact?: boolean;
};

export default function PaymentQrDisplay({
  paymentRef,
  tourId,
  tourTitle,
  amount,
  bookingId,
  createdAt,
  compact = false,
}: PaymentQrDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setError(null);
      setDataUrl(null);
      try {
        const payload = buildPaymentQrPayload({
          payment_ref: paymentRef,
          tour_id: tourId,
          tour_title: tourTitle,
          amount,
          booking_id: bookingId,
          created_at: createdAt ?? new Date().toISOString(),
        });
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(payload, {
          width: 280,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#065f46', light: '#ffffff' },
        });
        if (!cancelled) setDataUrl(url);
      } catch {
        if (!cancelled) setError('Не удалось сформировать QR-код');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [paymentRef, tourId, tourTitle, amount, bookingId, createdAt]);

  const size = compact ? 192 : 224;

  return (
    <div className="bg-white p-5 sm:p-6 rounded-xl border-2 border-emerald-200 shadow-sm">
      <div className="relative mx-auto rounded-xl overflow-hidden border border-gray-100 bg-white"
        style={{ width: size, height: size }}>
        {!dataUrl && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Генерация QR…</span>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-500 px-3 text-center">
            <QrCode className="w-10 h-10" />
            <span className="text-xs font-medium">{error}</span>
          </div>
        )}
        {dataUrl && (
          <Image
            src={dataUrl}
            alt="QR-код для оплаты"
            width={size}
            height={size}
            unoptimized
            className="w-full h-full object-contain"
          />
        )}
      </div>
      <p className="text-xs text-center text-gray-400 mt-4 font-mono break-all">
        {paymentRef.slice(0, 8).toUpperCase()}
      </p>
    </div>
  );
}
