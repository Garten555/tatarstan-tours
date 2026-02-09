import Link from 'next/link';
import { Share2, CheckCircle2, Users } from 'lucide-react';

type TourBookingCardProps = {
  price: number;
  availableSpots: number;
  maxParticipants: number;
  isFullyBooked: boolean;
  bookingHref: string;
};

export default function TourBookingCard({
  price,
  availableSpots,
  maxParticipants,
  isFullyBooked,
  bookingHref,
}: TourBookingCardProps) {
  const availabilityPercentage = (availableSpots / maxParticipants) * 100;

  return (
    <aside className="w-full md:w-full lg:w-[320px] xl:w-[380px] 2xl:w-[400px] lg:sticky lg:top-24 lg:self-start h-fit z-20">
      <div className="bg-white rounded-xl sm:rounded-2xl md:rounded-2xl lg:rounded-3xl border-2 border-gray-200 shadow-xl p-4 sm:p-5 md:p-6 lg:p-6 xl:p-7 2xl:p-8 flex flex-col gap-4 sm:gap-5 md:gap-5 lg:gap-6 xl:gap-7 hover:shadow-2xl transition-all duration-300 w-full max-w-full">
        {/* Блок с ценой */}
        <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 rounded-lg sm:rounded-xl md:rounded-xl lg:rounded-2xl p-4 sm:p-5 md:p-5 lg:p-6 xl:p-7 2xl:p-8 border-2 border-emerald-400/30 shadow-lg overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-32 lg:h-32 bg-white/10 rounded-full -mr-12 sm:-mr-14 md:-mr-16 -mt-12 sm:-mt-14 md:-mt-16 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-20 h-20 sm:w-22 sm:h-22 md:w-24 md:h-24 lg:w-24 lg:h-24 bg-white/10 rounded-full -ml-10 sm:-ml-11 md:-ml-12 -mb-10 sm:-mb-11 md:-mb-12 blur-2xl" />
          <div className="relative z-10">
            <div className="text-[10px] sm:text-xs md:text-xs lg:text-sm text-emerald-100 uppercase tracking-widest font-black mb-2 sm:mb-2.5 md:mb-3 lg:mb-3">Цена</div>
            <div className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-6xl font-black text-white mb-1 sm:mb-1.5 md:mb-2 leading-tight break-words">
              {price.toLocaleString('ru-RU')} ₽
            </div>
            <div className="text-sm sm:text-base md:text-base lg:text-lg xl:text-lg text-emerald-100 font-bold">за человека</div>
          </div>
        </div>

        {/* Блок с доступными местами */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg sm:rounded-xl md:rounded-xl lg:rounded-2xl p-4 sm:p-5 md:p-5 lg:p-6 border-2 border-gray-200 shadow-sm">
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 xs:gap-0 mb-3 sm:mb-3.5 md:mb-4 lg:mb-4">
            <div className="flex items-center gap-2 sm:gap-2 md:gap-2.5">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 text-gray-600 flex-shrink-0" />
              <span className="text-sm sm:text-base md:text-base lg:text-lg text-gray-700 font-bold whitespace-nowrap">Доступно мест:</span>
            </div>
            <span className="text-lg sm:text-xl md:text-xl lg:text-2xl font-black text-gray-900 whitespace-nowrap">
              {availableSpots} / {maxParticipants}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3.5 sm:h-4 md:h-4 lg:h-4 overflow-hidden shadow-inner">
            <div
              className={`h-3.5 sm:h-4 md:h-4 lg:h-4 rounded-full transition-all duration-700 shadow-lg ${
                availabilityPercentage > 50
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                  : availabilityPercentage > 25
                  ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                  : 'bg-gradient-to-r from-red-500 to-red-600'
              }`}
              style={{ width: `${availabilityPercentage}%` }}
            />
          </div>
          {availabilityPercentage < 25 && !isFullyBooked && (
            <p className="text-sm sm:text-sm md:text-sm text-red-600 font-bold mt-2 sm:mt-2 md:mt-2.5">Осталось мало мест!</p>
          )}
        </div>

        {/* Кнопка бронирования */}
        {isFullyBooked ? (
          <button
            className="w-full py-3 sm:py-3.5 md:py-4 lg:py-4 xl:py-5 rounded-lg sm:rounded-xl md:rounded-xl lg:rounded-2xl font-black text-base sm:text-lg md:text-lg lg:text-xl xl:text-xl bg-gray-200 text-gray-500 cursor-not-allowed shadow-inner border-2 border-gray-300"
            disabled
          >
            Мест нет
          </button>
        ) : (
          <Link
            href={bookingHref}
            className="w-full py-3 sm:py-3.5 md:py-4 lg:py-4 xl:py-5 rounded-lg sm:rounded-xl md:rounded-xl lg:rounded-2xl font-black text-base sm:text-lg md:text-lg lg:text-xl xl:text-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-600 text-white hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-700 transition-all duration-300 text-center shadow-xl hover:shadow-2xl transform hover:-translate-y-1 border-2 border-emerald-400/30 active:scale-95"
          >
            Забронировать
          </Link>
        )}

        {/* Список преимуществ */}
        <div className="space-y-2.5 sm:space-y-3 md:space-y-3 lg:space-y-4">
          <div className="flex items-start gap-3 sm:gap-3.5 md:gap-4 lg:gap-4 p-3 sm:p-3.5 md:p-4 lg:p-5 rounded-lg sm:rounded-xl md:rounded-xl lg:rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-2 border-emerald-200 hover:border-emerald-300 transition-all duration-200 shadow-sm">
            <CheckCircle2 className="w-5 h-5 sm:w-5 md:w-5 lg:w-6 lg:h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm sm:text-base md:text-base lg:text-lg text-gray-800 font-bold leading-relaxed">Бесплатная отмена за 24 часа</span>
          </div>
          <div className="flex items-start gap-3 sm:gap-3.5 md:gap-4 lg:gap-4 p-3 sm:p-3.5 md:p-4 lg:p-5 rounded-lg sm:rounded-xl md:rounded-xl lg:rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-2 border-emerald-200 hover:border-emerald-300 transition-all duration-200 shadow-sm">
            <CheckCircle2 className="w-5 h-5 sm:w-5 md:w-5 lg:w-6 lg:h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm sm:text-base md:text-base lg:text-lg text-gray-800 font-bold leading-relaxed">Подтверждение за 1 час</span>
          </div>
          <div className="flex items-start gap-3 sm:gap-3.5 md:gap-4 lg:gap-4 p-3 sm:p-3.5 md:p-4 lg:p-5 rounded-lg sm:rounded-xl md:rounded-xl lg:rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-2 border-emerald-200 hover:border-emerald-300 transition-all duration-200 shadow-sm">
            <CheckCircle2 className="w-5 h-5 sm:w-5 md:w-5 lg:w-6 lg:h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm sm:text-base md:text-base lg:text-lg text-gray-800 font-bold leading-relaxed">Опытный гид</span>
          </div>
        </div>

        {/* Кнопка "Поделиться" */}
        <button className="w-full py-3 sm:py-3.5 md:py-4 lg:py-4 xl:py-5 rounded-lg sm:rounded-xl md:rounded-xl lg:rounded-2xl border-2 border-gray-200 text-sm sm:text-base md:text-base lg:text-lg font-black text-gray-700 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-300 flex items-center justify-center gap-2.5 sm:gap-3 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95">
          <Share2 className="w-5 h-5 sm:w-5 md:w-5 lg:w-6 lg:h-6" />
          Поделиться
        </button>
      </div>
    </aside>
  );
}

