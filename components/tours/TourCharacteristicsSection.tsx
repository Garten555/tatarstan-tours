import { Calendar, Clock, Coins, Users } from 'lucide-react';

type TourCharacteristicsSectionProps = {
  startDateLabel: string;
  durationLabel: string;
  maxParticipants: number;
  priceLabel: string;
};

export default function TourCharacteristicsSection({
  startDateLabel,
  durationLabel,
  maxParticipants,
  priceLabel,
}: TourCharacteristicsSectionProps) {
  return (
    <section className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 shadow-sm p-4 sm:p-5 md:p-6 lg:p-8 hover:shadow-xl transition-all duration-300 w-full max-w-full overflow-hidden">
      <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 mb-4 sm:mb-5 md:mb-6 lg:mb-8">Характеристики</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5 w-full">
        <div className="group flex items-center gap-3 sm:gap-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 px-4 sm:px-5 md:px-6 py-4 sm:py-5 border-2 border-emerald-200 hover:shadow-lg hover:border-emerald-300 transition-all duration-200">
          <div className="p-2.5 sm:p-3 md:p-3.5 bg-emerald-500/20 rounded-lg sm:rounded-xl group-hover:bg-emerald-500/30 transition-colors flex-shrink-0">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] sm:text-xs text-emerald-700 uppercase tracking-wider font-bold mb-1 sm:mb-1.5">Начало</div>
            <div className="font-black text-gray-900 text-base sm:text-lg md:text-xl break-words">{startDateLabel}</div>
          </div>
        </div>
        <div className="group flex items-center gap-3 sm:gap-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 px-4 sm:px-5 md:px-6 py-4 sm:py-5 border-2 border-blue-200 hover:shadow-lg hover:border-blue-300 transition-all duration-200">
          <div className="p-2.5 sm:p-3 md:p-3.5 bg-blue-500/20 rounded-lg sm:rounded-xl group-hover:bg-blue-500/30 transition-colors flex-shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] sm:text-xs text-blue-700 uppercase tracking-wider font-bold mb-1 sm:mb-1.5">Продолжительность</div>
            <div className="font-black text-gray-900 text-base sm:text-lg md:text-xl break-words">{durationLabel}</div>
          </div>
        </div>
        <div className="group flex items-center gap-3 sm:gap-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 px-4 sm:px-5 md:px-6 py-4 sm:py-5 border-2 border-purple-200 hover:shadow-lg hover:border-purple-300 transition-all duration-200">
          <div className="p-2.5 sm:p-3 md:p-3.5 bg-purple-500/20 rounded-lg sm:rounded-xl group-hover:bg-purple-500/30 transition-colors flex-shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] sm:text-xs text-purple-700 uppercase tracking-wider font-bold mb-1 sm:mb-1.5">Участники</div>
            <div className="font-black text-gray-900 text-base sm:text-lg md:text-xl break-words">До {maxParticipants} человек</div>
          </div>
        </div>
        <div className="group flex items-center gap-3 sm:gap-4 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 px-4 sm:px-5 md:px-6 py-4 sm:py-5 border-2 border-amber-200 hover:shadow-lg hover:border-amber-300 transition-all duration-200">
          <div className="p-2.5 sm:p-3 md:p-3.5 bg-amber-500/20 rounded-lg sm:rounded-xl group-hover:bg-amber-500/30 transition-colors flex-shrink-0">
            <Coins className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] sm:text-xs text-amber-700 uppercase tracking-wider font-bold mb-1 sm:mb-1.5">Цена</div>
            <div className="font-black text-gray-900 text-base sm:text-lg md:text-xl break-words">{priceLabel}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

