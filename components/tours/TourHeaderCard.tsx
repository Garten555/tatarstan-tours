import Image from 'next/image';

const TOUR_TYPE_META: Record<string, { label: string; emoji: string }> = {
  excursion: { label: 'Экскурсия', emoji: '🏛️' },
  hiking: { label: 'Пеший тур', emoji: '🥾' },
  cruise: { label: 'Круиз', emoji: '⛴️' },
  bus_tour: { label: 'Автобусный тур', emoji: '🚌' },
  walking_tour: { label: 'Прогулка', emoji: '🚶' },
  multi_day: { label: 'Многодневный', emoji: '🗓️' },
  weekend: { label: 'Выходные', emoji: '🌤️' },
};

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  history: { label: 'История', emoji: '📜' },
  nature: { label: 'Природа', emoji: '🌲' },
  culture: { label: 'Культура', emoji: '🎭' },
  architecture: { label: 'Архитектура', emoji: '🏰' },
  food: { label: 'Гастрономия', emoji: '🍽️' },
  adventure: { label: 'Приключения', emoji: '⛰️' },
  gastronomy: { label: 'Гастрономия', emoji: '🍽️' },
  active: { label: 'Активный отдых', emoji: '⛰️' },
  religious: { label: 'Религиозные', emoji: '🕌' },
};

type TourHeaderCardProps = {
  coverImage: string;
  title: string;
  shortDesc?: string | null;
  tourType: string;
  category: string;
};

export default function TourHeaderCard({
  coverImage,
  title,
  shortDesc,
  tourType,
  category,
}: TourHeaderCardProps) {
  const tourTypeMeta = TOUR_TYPE_META[tourType] || { label: tourType, emoji: '🧭' };
  const categoryMeta = CATEGORY_META[category] || { label: category, emoji: '🧩' };

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 w-full max-w-full">
      <div className="relative h-80 md:h-96 lg:h-[500px] overflow-hidden group w-full">
        <Image
          src={coverImage}
          alt={title}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          priority
        />
        {/* Градиентный оверлей для лучшей читаемости */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
        
        {/* Бейджи с улучшенным дизайном и эмодзи */}
        <div className="absolute top-3 sm:top-4 md:top-6 left-3 sm:left-4 md:left-6 flex flex-wrap gap-2 sm:gap-3 z-10">
          <span className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white/95 text-emerald-700 text-xs sm:text-sm font-black rounded-lg sm:rounded-xl backdrop-blur-md shadow-xl border-2 border-emerald-200/50 hover:bg-white transition-all duration-200 inline-flex items-center gap-1.5 sm:gap-2">
            <span className="text-sm sm:text-base leading-none">{tourTypeMeta.emoji}</span>
            {tourTypeMeta.label}
          </span>
          <span className="px-3 py-2 sm:px-4 sm:py-2.5 bg-white/95 text-blue-700 text-xs sm:text-sm font-black rounded-lg sm:rounded-xl backdrop-blur-md shadow-xl border-2 border-blue-200/50 hover:bg-white transition-all duration-200 inline-flex items-center gap-1.5 sm:gap-2">
            <span className="text-sm sm:text-base leading-none">{categoryMeta.emoji}</span>
            {categoryMeta.label}
          </span>
        </div>
      </div>
      <div className="p-4 sm:p-5 md:p-6 lg:p-8 xl:p-10 w-full">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl font-black text-gray-900 break-words [overflow-wrap:anywhere] leading-tight tracking-tight mb-3 sm:mb-4">
          {title}
        </h1>
        {shortDesc && (
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 leading-relaxed break-words [overflow-wrap:anywhere] font-semibold">
            {shortDesc}
          </p>
        )}
      </div>
    </section>
  );
}

