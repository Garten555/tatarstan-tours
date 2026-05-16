import { createPaymentQrDataUrl } from '@/lib/payment/payment-qr';

type BookingSuccessQrProps = {
  bookingId: string;
  tourId: string;
  tourTitle: string;
  amount: number;
  createdAt: string;
  paymentRef?: string | null;
};

export default async function BookingSuccessQr({
  bookingId,
  tourId,
  tourTitle,
  amount,
  createdAt,
  paymentRef,
}: BookingSuccessQrProps) {
  const ref = paymentRef || bookingId;
  const dataUrl = await createPaymentQrDataUrl({
    payment_ref: ref,
    booking_id: bookingId,
    tour_id: tourId,
    tour_title: tourTitle,
    amount,
    created_at: createdAt,
  });

  return (
    <div className="mt-6 p-6 bg-emerald-50 border-2 border-emerald-200 rounded-2xl">
      <h3 className="text-lg font-bold text-emerald-900 mb-2 text-center">
        Ваш QR-код для демо-оплаты
      </h3>
      <p className="text-sm text-emerald-800 text-center mb-4">
        Реального списания нет — код уникален для бронирования {bookingId.slice(0, 8).toUpperCase()}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt="QR-код оплаты"
        width={224}
        height={224}
        className="mx-auto block rounded-xl border border-emerald-200 bg-white p-2"
      />
    </div>
  );
}
