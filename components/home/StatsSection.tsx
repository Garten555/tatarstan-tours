export function StatsSection() {
  const stats = [
    { label: 'Туров по Татарстану', value: '120+', icon: '🗺️' },
    { label: 'Профессиональных гидов', value: '40+', icon: '👥' },
    { label: 'Довольных туристов', value: '8 500+', icon: '⭐' },
    { label: 'Средний рейтинг', value: '4.9/5', icon: '💚' },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden bg-white">
      {/* Декоративные элементы */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-sky-100/30 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {stats.map((item) => (
            <div
              key={item.label}
              className="group relative rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-sm border border-emerald-100/50 p-4 sm:p-5 md:p-6 lg:p-8 text-center shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-emerald-300"
            >
              {/* Декоративный элемент */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 text-xl sm:text-2xl md:text-3xl opacity-20 group-hover:opacity-30 transition-opacity">
                {item.icon}
              </div>
              
              <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-emerald-500 mb-2 sm:mb-3">
                {item.value}
              </div>
              <div className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-700 font-semibold leading-tight">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
