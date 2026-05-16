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
    <div className="mt-6 p-6 bg-emerald-50 border-2 border-emerald-200 rounded-2xl flex justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={dataUrl}
        alt="QR-код оплаты"
        width={224}
        height={224}
        className="rounded-xl border border-emerald-200 bg-white p-2"
      />
    </div>
  );
}
