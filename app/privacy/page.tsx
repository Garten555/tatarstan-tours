import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Shield, GraduationCap, Lock, Eye, Database, UserCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности | Туры по Татарстану',
  description: 'Политика конфиденциальности платформы для бронирования туров',
};

export default function PrivacyPage() {
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
            <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600" />
            <span className="text-emerald-700 text-xs sm:text-sm font-semibold uppercase tracking-wider">Конфиденциальность</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 mb-3 sm:mb-5 px-2">
            Политика конфиденциальности
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 font-medium leading-relaxed px-2">
            Как мы защищаем и обрабатываем ваши персональные данные
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
                Все персональные данные обрабатываются в рамках учебного процесса. 
                Мы прилагаем все усилия для защиты ваших данных, но не гарантируем абсолютную безопасность 
                в связи с образовательным характером проекта.
              </p>
            </div>
          </div>
        </div>

        {/* Контент */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100/50 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
          {/* Раздел 1 */}
          <section>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">1. Общие положения</h2>
            </div>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки 
                и защиты персональных данных пользователей платформы «Татарстан тур» (далее — «Платформа»).
              </p>
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Используя Платформу, вы даете согласие на обработку ваших персональных данных в соответствии 
                с настоящей Политикой.
              </p>
            </div>
          </section>

          {/* Раздел 2 */}
          <section>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Database className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">2. Какие данные мы собираем</h2>
            </div>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                При использовании Платформы мы можем собирать следующие данные:
              </p>
              <ul className="list-disc list-inside space-y-3 text-base sm:text-lg md:text-xl ml-4 sm:ml-6 leading-7 sm:leading-8">
                <li><strong>Персональные данные:</strong> имя, фамилия, отчество, email, телефон</li>
                <li><strong>Данные профиля:</strong> аватар, биография, настройки приватности</li>
                <li><strong>Данные о бронированиях:</strong> информация о забронированных турах, участниках</li>
                <li><strong>Контент:</strong> дневники путешествий, отзывы, комментарии, фотографии</li>
                <li><strong>Технические данные:</strong> IP-адрес, тип браузера, данные об устройстве</li>
                <li><strong>Данные об активности:</strong> история посещений, взаимодействия с платформой</li>
              </ul>
            </div>
          </section>

          {/* Раздел 3 */}
          <section>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">3. Как мы используем данные</h2>
            </div>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Мы используем собранные данные для следующих целей:
              </p>
              <ul className="list-disc list-inside space-y-3 text-base sm:text-lg md:text-xl ml-4 sm:ml-6 leading-7 sm:leading-8">
                <li>Предоставление услуг платформы (бронирование туров, создание дневников)</li>
                <li>Связь с пользователями по вопросам бронирований и сервиса</li>
                <li>Улучшение работы платформы и пользовательского опыта</li>
                <li>Обеспечение безопасности и предотвращение мошенничества</li>
                <li>Соблюдение требований законодательства</li>
                <li>Аналитика и статистика использования платформы</li>
              </ul>
            </div>
          </section>

          {/* Раздел 4 */}
          <section>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">4. Защита данных</h2>
            </div>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Мы применяем различные меры для защиты ваших персональных данных:
              </p>
              <ul className="list-disc list-inside space-y-3 text-base sm:text-lg md:text-xl ml-4 sm:ml-6 leading-7 sm:leading-8">
                <li>Шифрование данных при передаче (HTTPS)</li>
                <li>Безопасное хранение данных в защищенных базах данных</li>
                <li>Ограничение доступа к персональным данным</li>
                <li>Регулярное обновление систем безопасности</li>
              </ul>
              <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 sm:p-5 mt-4 sm:mt-5">
                <p className="text-base sm:text-lg md:text-xl text-amber-900 font-semibold leading-7 sm:leading-8">
                  ⚠️ <strong>Важно:</strong> Поскольку данная платформа является дипломным проектом, 
                  мы не можем гарантировать абсолютную безопасность данных. Рекомендуем не использовать 
                  реальные персональные данные или использовать тестовые данные.
                </p>
              </div>
            </div>
          </section>

          {/* Раздел 5 */}
          <section>
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 flex-shrink-0" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900">5. Ваши права</h2>
            </div>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Вы имеете право:
              </p>
              <ul className="list-disc list-inside space-y-3 text-base sm:text-lg md:text-xl ml-4 sm:ml-6 leading-7 sm:leading-8">
                <li>Получать информацию о ваших персональных данных</li>
                <li>Требовать исправления неточных данных</li>
                <li>Требовать удаления ваших персональных данных</li>
                <li>Ограничивать обработку ваших данных</li>
                <li>Отозвать согласие на обработку данных</li>
                <li>Получить копию ваших данных в структурированном формате</li>
              </ul>
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8 mt-4 sm:mt-5">
                Для реализации ваших прав обратитесь к администрации через раздел{' '}
                <Link href="/contacts" className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold break-words">
                  Контакты
                </Link>.
              </p>
            </div>
          </section>

          {/* Раздел 6 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">6. Передача данных третьим лицам</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Мы не передаем ваши персональные данные третьим лицам, за исключением случаев:
              </p>
              <ul className="list-disc list-inside space-y-3 text-base sm:text-lg md:text-xl ml-4 sm:ml-6 leading-7 sm:leading-8">
                <li>Когда это необходимо для предоставления услуг (например, гидам для организации туров)</li>
                <li>Когда это требуется по закону или по запросу государственных органов</li>
                <li>Когда вы дали явное согласие на передачу данных</li>
              </ul>
            </div>
          </section>

          {/* Раздел 7 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">7. Cookies и аналогичные технологии</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Платформа использует cookies и аналогичные технологии для:
              </p>
              <ul className="list-disc list-inside space-y-3 text-base sm:text-lg md:text-xl ml-4 sm:ml-6 leading-7 sm:leading-8">
                <li>Обеспечения работы функций платформы</li>
                <li>Сохранения ваших предпочтений и настроек</li>
                <li>Анализа использования платформы</li>
                <li>Улучшения пользовательского опыта</li>
              </ul>
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8 mt-4 sm:mt-5">
                Вы можете управлять настройками cookies через настройки вашего браузера.
              </p>
            </div>
          </section>

          {/* Раздел 8 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">8. Хранение данных</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Мы храним ваши персональные данные в течение срока, необходимого для:
              </p>
              <ul className="list-disc list-inside space-y-3 text-base sm:text-lg md:text-xl ml-4 sm:ml-6 leading-7 sm:leading-8">
                <li>Предоставления услуг платформы</li>
                <li>Соблюдения требований законодательства</li>
                <li>Разрешения споров и выполнения соглашений</li>
              </ul>
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8 mt-4 sm:mt-5">
                После истечения срока хранения данные удаляются или обезличиваются.
              </p>
            </div>
          </section>

          {/* Раздел 9 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">9. Изменения в политике</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Мы оставляем за собой право изменять настоящую Политику конфиденциальности. 
                О существенных изменениях мы уведомим пользователей через Платформу или по email.
              </p>
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                Продолжение использования Платформы после внесения изменений означает ваше согласие 
                с новой версией Политики.
              </p>
            </div>
          </section>

          {/* Раздел 10 */}
          <section>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 mb-4 sm:mb-6">10. Контакты</h2>
            <div className="space-y-4 sm:space-y-5 text-gray-800 leading-relaxed">
              <p className="text-base sm:text-lg md:text-xl leading-7 sm:leading-8">
                По всем вопросам, связанным с обработкой персональных данных, вы можете обратиться 
                через раздел{' '}
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

