import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { CheckCircle2, Calendar, Users, MapPin, CreditCard, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface BookingSuccessPageProps {
  searchParams: Promise<{ id?: string }>;
}

export default async function BookingSuccessPage({ searchParams }: BookingSuccessPageProps) {
  const { id } = await searchParams;
  const supabase = await createClient();
  const serviceClient = await createServiceClient();

  // Проверяем авторизацию
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  if (!id) {
    redirect('/tours');
  }

  // Загружаем данные бронирования
  const { data: booking, error: bookingError } = await serviceClient
    .from('bookings')
    .select(`
      *,
      tour:tours(
        id,
        title,
        slug,
        start_date,
        city:cities(name)
      )
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (bookingError || !booking) {
    redirect('/tours');
  }

  const b = booking as any;
  const tour = b.tour as any;

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Определяем способ оплаты
  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      card: 'Банковская карта',
      cash: 'Наличными при встрече',
      qr_code: 'QR-код',
    };
    return methods[method] || method;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Успех */}
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center mb-6">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Бронирование успешно создано!
            </h1>
            <p className="text-gray-600">
              Ваше бронирование подтверждено. Детали отправлены на вашу почту.
            </p>
          </div>

          {/* Детали бронирования */}
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Детали бронирования
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Тур</div>
                  <div className="font-medium text-gray-900">{tour.title}</div>
                </div>
              </div>

              {tour.city && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Город</div>
                    <div className="font-medium text-gray-900">{tour.city.name}</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Дата начала</div>
                  <div className="font-medium text-gray-900">
                    {formatDate(tour.start_date)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Количество участников</div>
                  <div className="font-medium text-gray-900">
                    {b.num_people} {b.num_people === 1 ? 'человек' : 'человека'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">Способ оплаты</div>
                  <div className="font-medium text-gray-900">
                    {getPaymentMethodLabel(b.payment_method)}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Итого</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {parseFloat(b.total_price).toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Действия */}
          <div className="flex gap-4">
            <Link
              href={`/tours/${tour.slug}`}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors text-center"
            >
              Вернуться к туру
            </Link>
            <Link
              href="/profile"
              className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors text-center"
            >
              Мои бронирования
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

