import { Metadata } from 'next';
import { ArrowLeft, MapPin, Users, Award, Heart, Shield, Clock, Star } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'О нас | Татарстан тур',
  description: 'Узнайте больше о нашей компании, наших ценностях и миссии. Мы предлагаем уникальные туры по Татарстану с профессиональными гидами.',
  keywords: ['о нас', 'компания', 'туры по Татарстану', 'экскурсии', 'Татарстан тур'],
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero секция */}
      <section className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 text-white py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 sm:gap-3 text-gray-900 hover:text-emerald-600 transition-all duration-300 mb-6 sm:mb-8 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-md shadow-md hover:shadow-xl border-2 border-white/30 hover:border-emerald-300 hover:bg-white"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform duration-300 flex-shrink-0" />
            <span className="font-bold text-sm sm:text-base">Назад на главную</span>
          </Link>
          
          <div className="max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 sm:mb-6 leading-tight">
              О нас
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 leading-relaxed font-medium">
              Откройте для себя красоту и культуру Татарстана с нашими уникальными турами
            </p>
          </div>
        </div>
      </section>

      {/* Основной контент */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        {/* О компании */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 md:p-10 lg:p-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-4 sm:mb-6">
              О компании
            </h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed mb-4 sm:mb-6 font-medium">
                <strong>Татарстан тур</strong> — это современная платформа для организации и бронирования туристических туров по достопримечательностям Республики Татарстан.
              </p>
              <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed mb-4 sm:mb-6 font-medium">
                Мы предлагаем уникальные экскурсионные программы, которые позволяют туристам познакомиться с богатой историей, культурой и природой Татарстана. Наши профессиональные гиды помогут вам открыть для себя самые интересные места региона.
              </p>
              <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed font-medium">
                Наша миссия — сделать путешествия по Татарстану доступными, комфортными и незабываемыми для каждого туриста.
              </p>
            </div>
          </div>
        </section>

        {/* Наши ценности */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-6 sm:mb-8 text-center">
            Наши ценности
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                icon: Heart,
                title: 'Любовь к региону',
                description: 'Мы искренне любим Татарстан и хотим поделиться этой любовью с каждым туристом',
                color: 'emerald',
              },
              {
                icon: Users,
                title: 'Профессионализм',
                description: 'Наши гиды — опытные специалисты, знающие каждый уголок Татарстана',
                color: 'blue',
              },
              {
                icon: Shield,
                title: 'Безопасность',
                description: 'Мы гарантируем безопасность и комфорт на всех наших турах',
                color: 'purple',
              },
              {
                icon: Star,
                title: 'Качество',
                description: 'Мы стремимся к высочайшему качеству обслуживания и организации туров',
                color: 'amber',
              },
            ].map((value, index) => {
              const Icon = value.icon;
              const colorClasses = {
                emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                blue: 'bg-blue-50 text-blue-600 border-blue-200',
                purple: 'bg-purple-50 text-purple-600 border-purple-200',
                amber: 'bg-amber-50 text-amber-600 border-amber-200',
              };
              
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 p-5 sm:p-6 hover:shadow-xl transition-all duration-300"
                >
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl ${colorClasses[value.color as keyof typeof colorClasses]} flex items-center justify-center mb-4 sm:mb-5`}>
                    <Icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 mb-2 sm:mb-3">
                    {value.title}
                  </h3>
                  <p className="text-sm sm:text-base md:text-lg text-gray-600 leading-relaxed font-medium">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Что мы предлагаем */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 lg:p-12 border-2 border-emerald-200">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-6 sm:mb-8">
              Что мы предлагаем
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {[
                {
                  icon: MapPin,
                  title: 'Экскурсии по городам',
                  description: 'Казань, Свияжск, Болгар и другие исторические города Татарстана',
                },
                {
                  icon: Clock,
                  title: 'Гибкое расписание',
                  description: 'Туры на любой день недели с удобным временем начала',
                },
                {
                  icon: Users,
                  title: 'Групповые и индивидуальные туры',
                  description: 'Выберите формат, который вам больше подходит',
                },
                {
                  icon: Award,
                  title: 'Профессиональные гиды',
                  description: 'Опытные экскурсоводы с глубокими знаниями истории и культуры',
                },
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 border border-emerald-200 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-100 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-900 mb-1 sm:mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-medium">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA секция */}
        <section>
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 lg:p-12 text-white text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 sm:mb-6">
              Готовы начать путешествие?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 font-medium max-w-2xl mx-auto">
              Выберите один из наших туров и забронируйте место прямо сейчас
            </p>
            <Link
              href="/tours"
              className="inline-block bg-white text-emerald-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg md:text-xl hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
            >
              Посмотреть туры
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

