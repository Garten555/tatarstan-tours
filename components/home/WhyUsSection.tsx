import { MapPin, Coins, MessageCircle, Shield } from 'lucide-react';

const features = [
  {
    title: 'Авторские маршруты',
    description: 'Уникальные программы, разработанные местными экспертами и историками для незабываемых впечатлений.',
    icon: MapPin,
    color: 'emerald',
  },
  {
    title: 'Прозрачные цены',
    description: 'Без скрытых платежей и дополнительных сборов — вы сразу видите итоговую стоимость тура.',
    icon: Coins,
    color: 'sky',
  },
  {
    title: 'Живое общение',
    description: 'Чаты туров, уведомления и быстрые ответы от команды поддержки в режиме реального времени.',
    icon: MessageCircle,
    color: 'violet',
  },
  {
    title: 'Безопасность и комфорт',
    description: 'Проверенные гиды и продуманная логистика на каждом маршруте для вашего спокойствия.',
    icon: Shield,
    color: 'amber',
  },
];

const colorClasses = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
};

export function WhyUsSection() {
  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 relative overflow-hidden bg-white">
      {/* Декоративные элементы */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-emerald-50/50 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-sky-50/50 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 relative z-10">
        {/* Заголовок */}
        <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-emerald-100/50 border border-emerald-200/50 px-3 py-1.5 sm:px-4 sm:py-2 mb-4 sm:mb-5 md:mb-6">
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="text-emerald-700 text-xs sm:text-sm font-semibold uppercase tracking-wider">Преимущества</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-gray-900 mb-3 sm:mb-4 md:mb-5">
            Почему выбирают нас
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-gray-600 max-w-3xl mx-auto font-medium leading-relaxed px-2">
            Мы создаем путешествия, которые хочется вспоминать и рекомендовать друзьям
          </p>
        </div>

        {/* Карточки преимуществ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group relative rounded-xl sm:rounded-2xl bg-white border-2 border-gray-100 p-5 sm:p-6 md:p-8 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:border-emerald-200"
              >
                {/* Иконка */}
                <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl ${colorClasses[item.color as keyof typeof colorClasses]} mb-4 sm:mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                
                {/* Заголовок */}
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-emerald-600 transition-colors">
                  {item.title}
                </h3>
                
                {/* Описание */}
                <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
