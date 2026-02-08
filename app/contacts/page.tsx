import { Metadata } from 'next';
import { ArrowLeft, MapPin, Phone, Mail, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Контакты | Татарстан тур',
  description: 'Свяжитесь с нами для бронирования туров или получения дополнительной информации. Мы всегда готовы помочь вам организовать незабываемое путешествие по Татарстану.',
  keywords: ['контакты', 'связь', 'туры по Татарстану', 'бронирование', 'Татарстан тур'],
};

export default function ContactsPage() {
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
              Контакты
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 leading-relaxed font-medium">
              Свяжитесь с нами любым удобным способом. Мы всегда готовы ответить на ваши вопросы и помочь организовать незабываемое путешествие
            </p>
          </div>
        </div>
      </section>

      {/* Основной контент */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        {/* Контактная информация */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-6 sm:p-8 md:p-10 lg:p-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-6 sm:mb-8">
              Свяжитесь с нами
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 mb-4 sm:mb-5">
                  Контактная информация
                </h3>
                <div className="space-y-4 sm:space-y-5">
                  <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-gray-50 hover:bg-emerald-50 transition-colors border-2 border-transparent hover:border-emerald-200">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm sm:text-base font-bold text-gray-500 mb-1">Адрес</h4>
                      <p className="text-base sm:text-lg md:text-xl text-gray-900 font-medium">
                        г. Набережные Челны, Нур-Баян, Д. 28
                      </p>
                    </div>
                  </div>
                  
                  <a
                    href="tel:+79951334782"
                    className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-gray-50 hover:bg-emerald-50 transition-colors border-2 border-transparent hover:border-emerald-200 group"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                      <Phone className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm sm:text-base font-bold text-gray-500 mb-1">Телефон</h4>
                      <p className="text-base sm:text-lg md:text-xl text-emerald-600 hover:text-emerald-700 font-bold transition-colors">
                        +7 995 133-47-82
                      </p>
                    </div>
                  </a>
                  
                  <a
                    href="mailto:Daniel-Mini@rambler.ru"
                    className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-gray-50 hover:bg-emerald-50 transition-colors border-2 border-transparent hover:border-emerald-200 group"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                      <Mail className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm sm:text-base font-bold text-gray-500 mb-1">Email</h4>
                      <p className="text-base sm:text-lg md:text-xl text-emerald-600 hover:text-emerald-700 font-bold transition-colors break-all">
                        Daniel-Mini@rambler.ru
                      </p>
                    </div>
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 mb-4 sm:mb-5">
                  Мы в социальных сетях
                </h3>
                <div className="space-y-4 sm:space-y-5">
                  <a
                    href="https://vk.com/id563822679"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors border-2 border-transparent hover:border-blue-200 group"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.710-1.033-1.004-1.49-1.14-1.747-1.14-.356 0-.458.102-.458.593v1.563c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.710 0-.204.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.271.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.491-.085.744-.576.744z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm sm:text-base font-bold text-gray-500 mb-1">ВКонтакте</h4>
                      <p className="text-base sm:text-lg text-gray-900 font-bold">vk.com/id563822679</p>
                    </div>
                  </a>
                  
                  <a
                    href="https://t.me/Vbhhhhhggy"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-gray-50 hover:bg-sky-50 transition-colors border-2 border-transparent hover:border-sky-200 group"
                  >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-sky-100 group-hover:bg-sky-200 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-sky-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm sm:text-base font-bold text-gray-500 mb-1">Telegram</h4>
                      <p className="text-base sm:text-lg text-gray-900 font-bold">@Vbhhhhhggy</p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Время работы */}
        <section className="mb-12 sm:mb-16 md:mb-20">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 lg:p-12 border-2 border-emerald-200">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-6 sm:mb-8">
              Время работы
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white rounded-lg sm:rounded-xl p-5 sm:p-6 border border-emerald-200">
                <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-3 sm:mb-4">
                  Офис
                </h3>
                <p className="text-base sm:text-lg text-gray-700 font-medium mb-2">
                  Понедельник - Пятница: <span className="font-bold text-emerald-600">9:00 - 18:00</span>
                </p>
                <p className="text-base sm:text-lg text-gray-700 font-medium mb-2">
                  Суббота: <span className="font-bold text-emerald-600">10:00 - 16:00</span>
                </p>
                <p className="text-base sm:text-lg text-gray-700 font-medium">
                  Воскресенье: <span className="font-bold text-gray-500">Выходной</span>
                </p>
              </div>
              <div className="bg-white rounded-lg sm:rounded-xl p-5 sm:p-6 border border-emerald-200">
                <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-3 sm:mb-4">
                  Онлайн поддержка
                </h3>
                <p className="text-base sm:text-lg text-gray-700 font-medium mb-2">
                  Круглосуточно, 24/7
                </p>
                <p className="text-sm sm:text-base text-gray-600 font-medium">
                  Мы всегда готовы ответить на ваши вопросы через мессенджеры и email
                </p>
              </div>
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/tours"
                className="inline-block bg-white text-emerald-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg md:text-xl hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
              >
                Посмотреть туры
              </Link>
              <Link
                href="/about"
                className="inline-block bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg md:text-xl hover:bg-white/20 transition-colors"
              >
                О нас
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

