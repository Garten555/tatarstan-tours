import { Search, CalendarCheck, Smile } from 'lucide-react';

const steps = [
  {
    title: 'Выберите тур',
    description: 'Сравните маршруты, даты и цены — всё в одном месте.',
    icon: Search,
    color: 'emerald',
  },
  {
    title: 'Забронируйте',
    description: 'Заполните данные и получите подтверждение на почту.',
    icon: CalendarCheck,
    color: 'sky',
  },
  {
    title: 'Наслаждайтесь поездкой',
    description: 'Получайте уведомления, общайтесь с гидом и путешествуйте.',
    icon: Smile,
    color: 'violet',
  },
];

const colorClasses = {
  emerald: 'bg-emerald-600',
  sky: 'bg-sky-600',
  violet: 'bg-violet-600',
};

export function HowItWorksSection() {
  return (
    <section className="py-12 sm:py-16 md:py-20 lg:py-24 relative overflow-hidden bg-white">
      {/* Декоративные элементы */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-emerald-50/30 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 relative z-10">
        {/* Заголовок */}
        <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-emerald-100/50 border border-emerald-200/50 px-3 py-1.5 sm:px-4 sm:py-2 mb-4 sm:mb-5 md:mb-6">
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="text-emerald-700 text-xs sm:text-sm font-semibold uppercase tracking-wider">Процесс</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-gray-900 mb-3 sm:mb-4 md:mb-5">
            Как это работает
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-gray-600 max-w-3xl mx-auto font-medium leading-relaxed px-2">
            Простая схема бронирования — без лишних шагов
          </p>
        </div>

        {/* Шаги */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="group relative rounded-xl sm:rounded-2xl bg-white border-2 border-gray-100 p-5 sm:p-6 md:p-8 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                {/* Номер шага */}
                <div className={`absolute -top-4 -left-4 sm:-top-5 sm:-left-5 md:-top-6 md:-left-6 w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-full ${colorClasses[step.color as keyof typeof colorClasses]} text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-lg group-hover:scale-110 transition-transform`}>
                  {index + 1}
                </div>

                {/* Иконка */}
                <div className="mb-4 sm:mb-5 md:mb-6 mt-2 sm:mt-3 md:mt-4">
                  <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg sm:rounded-xl border-2 group-hover:scale-110 transition-transform duration-300 ${
                    step.color === 'emerald' ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 border-emerald-200' :
                    step.color === 'sky' ? 'bg-gradient-to-br from-sky-100 to-sky-50 text-sky-700 border-sky-200' :
                    'bg-gradient-to-br from-violet-100 to-violet-50 text-violet-700 border-violet-200'
                  }`}>
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                  </div>
                </div>

                {/* Заголовок */}
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-emerald-600 transition-colors">
                  {step.title}
                </h3>

                {/* Описание */}
                <p className="text-base md:text-lg text-gray-600 leading-relaxed">
                  {step.description}
                </p>

                {/* Декоративная линия */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-gray-200 to-transparent" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
