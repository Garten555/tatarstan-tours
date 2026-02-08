import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, FileText, GraduationCap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Условия использования | Туры по Татарстану',
  description: 'Условия использования платформы для бронирования туров',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 py-8 lg:py-12 relative">
      {/* Декоративные элементы фона */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        {/* Кнопка назад */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-700 hover:text-emerald-600 transition-all duration-200 group mb-6 sm:mb-8"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-semibold text-sm sm:text-base md:text-lg">На главную</span>
        </Link>

        {/* Заголовок */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/50 border border-emerald-200/50 px-3 sm:px-4 py-1.5 sm:py-2 mb-4 sm:mb-6">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
            <span className="text-emerald-700 text-xs sm:text-sm font-semibold uppercase tracking-wider">Правовая информация</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-3 sm:mb-5 px-2">
            Условия использования
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 font-medium leading-relaxed px-2">
            Правила и условия использования платформы
          </p>
        </div>

        {/* Уведомление о дипломном проекте */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 shadow-lg">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 mb-2">
                Дипломный проект
              </h2>
              <p className="text-sm sm:text-base md:text-lg text-gray-700 font-medium leading-relaxed">
                Данная платформа является дипломным проектом, разработанным в образовательных целях. 
                Все функции и возможности предоставляются в рамках учебного процесса.
              </p>
            </div>
          </div>
        </div>

        {/* Контент */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100/50 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          {/* Раздел 1 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">1. Общие положения</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Настоящие Условия использования (далее — «Условия») регулируют отношения между пользователями 
                платформы «Татарстан тур» (далее — «Платформа») и администрацией платформы.
              </p>
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Используя Платформу, вы соглашаетесь с настоящими Условиями. Если вы не согласны с какими-либо 
                положениями, пожалуйста, не используйте Платформу.
              </p>
            </div>
          </section>

          {/* Раздел 2 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">2. Описание сервиса</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Платформа «Татарстан тур» предоставляет возможность:
              </p>
              <ul className="list-disc list-inside space-y-3 text-base sm:text-lg md:text-xl ml-4 sm:ml-6 leading-7 sm:leading-8">
                <li>Просмотра информации о турах по Татарстану</li>
                <li>Бронирования мест в турах</li>
                <li>Создания дневников путешествий</li>
                <li>Взаимодействия с другими пользователями</li>
                <li>Получения достижений и бейджей</li>
              </ul>
            </div>
          </section>

          {/* Раздел 3 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">3. Регистрация и аккаунт</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Для использования некоторых функций Платформы требуется регистрация. При регистрации вы обязуетесь:
              </p>
              <ul className="list-disc list-inside space-y-3 text-base sm:text-lg md:text-xl ml-4 sm:ml-6 leading-7 sm:leading-8">
                <li>Предоставлять достоверную и актуальную информацию</li>
                <li>Поддерживать безопасность вашего аккаунта</li>
                <li>Нести ответственность за все действия, совершенные под вашим аккаунтом</li>
                <li>Немедленно уведомлять о любом несанкционированном использовании аккаунта</li>
              </ul>
            </div>
          </section>

          {/* Раздел 4 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">4. Бронирование туров</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                При бронировании тура вы соглашаетесь с условиями конкретного тура, указанными на странице тура. 
                Администрация оставляет за собой право изменять условия туров и отменять бронирования в случае 
                форс-мажорных обстоятельств.
              </p>
            </div>
          </section>

          {/* Раздел 5 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">5. Контент пользователей</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Пользователи сохраняют права на контент, который они создают на Платформе (дневники, отзывы, комментарии). 
                Размещая контент, вы предоставляете Платформе право использовать, отображать и распространять этот контент 
                в рамках функционирования сервиса.
              </p>
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Запрещается размещать контент, который:
              </p>
              <ul className="list-disc list-inside space-y-3 text-base sm:text-lg md:text-xl ml-4 sm:ml-6 leading-7 sm:leading-8">
                <li>Нарушает права третьих лиц</li>
                <li>Содержит оскорбления, угрозы или дискриминацию</li>
                <li>Является незаконным или нарушает общественный порядок</li>
                <li>Содержит спам или рекламу без разрешения</li>
              </ul>
            </div>
          </section>

          {/* Раздел 6 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">6. Интеллектуальная собственность</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Все материалы Платформы, включая дизайн, тексты, графику, логотипы, являются собственностью 
                администрации или используются с разрешения правообладателей. Использование материалов без 
                письменного разрешения запрещено.
              </p>
            </div>
          </section>

          {/* Раздел 7 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">7. Ограничение ответственности</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Платформа предоставляется «как есть». Администрация не гарантирует бесперебойную работу сервиса 
                и не несет ответственности за возможные сбои или потерю данных.
              </p>
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Поскольку данная платформа является дипломным проектом, некоторые функции могут работать 
                нестабильно или быть недоступны.
              </p>
            </div>
          </section>

          {/* Раздел 8 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">8. Изменения в условиях</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Администрация оставляет за собой право изменять настоящие Условия в любое время. 
                Изменения вступают в силу с момента их публикации на Платформе. Продолжение использования 
                Платформы после внесения изменений означает ваше согласие с новыми условиями.
              </p>
            </div>
          </section>

          {/* Раздел 9 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">9. Контакты</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                По всем вопросам, связанным с использованием Платформы, вы можете обратиться через 
                форму обратной связи или связаться с администрацией через раздел{' '}
                <Link href="/contacts" className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold break-words">
                  Контакты
                </Link>.
              </p>
            </div>
          </section>

          {/* Дата вступления в силу */}
          <div className="pt-4 sm:pt-6 border-t-2 border-gray-200">
            <p className="text-xs sm:text-sm md:text-base text-gray-500 font-medium">
              Дата последнего обновления: {new Date().toLocaleDateString('ru-RU', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

