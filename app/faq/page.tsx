'use client';

import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, MessageSquare, Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: 'Бронирование',
    question: 'Как забронировать тур?',
    answer: 'Выберите интересующий вас тур на странице "Туры", нажмите кнопку "Забронировать", заполните форму с вашими данными и подтвердите бронирование. После этого вы получите подтверждение на email.',
  },
  {
    category: 'Бронирование',
    question: 'Нужно ли вносить предоплату?',
    answer: 'Да, для подтверждения бронирования требуется внесение предоплаты. Размер предоплаты и условия оплаты указаны в описании каждого тура.',
  },
  {
    category: 'Бронирование',
    question: 'Можно ли отменить бронирование?',
    answer: 'Да, вы можете отменить бронирование. Условия отмены и возврата средств зависят от времени до начала тура. Подробности указаны в условиях бронирования каждого тура.',
  },
  {
    category: 'Туры',
    question: 'Какие туры вы предлагаете?',
    answer: 'Мы предлагаем различные туры по Татарстану: экскурсии по Казани, Свияжску, Болгару, природные туры, гастрономические туры и многое другое. Полный список доступен на странице "Туры".',
  },
  {
    category: 'Туры',
    question: 'Сколько человек может участвовать в туре?',
    answer: 'Количество участников зависит от конкретного тура. В описании каждого тура указано максимальное количество мест. Вы можете выбрать количество участников при бронировании.',
  },
  {
    category: 'Туры',
    question: 'Что включено в стоимость тура?',
    answer: 'В стоимость тура обычно включены: услуги гида, транспорт (если указано), входные билеты в музеи и достопримечательности (если указано). Детали указаны в описании каждого тура.',
  },
  {
    category: 'Туры',
    question: 'Что нужно взять с собой на тур?',
    answer: 'Рекомендуем взять с собой: удобную обувь для ходьбы, воду, фотоаппарат, документы (паспорт для некоторых экскурсий), деньги на сувениры и дополнительные расходы.',
  },
  {
    category: 'Оплата',
    question: 'Какие способы оплаты доступны?',
    answer: 'Мы принимаем оплату банковскими картами через наш сайт. Также возможна оплата наличными при встрече с гидом (для некоторых туров).',
  },
  {
    category: 'Оплата',
    question: 'Безопасна ли оплата через сайт?',
    answer: 'Да, все платежи обрабатываются через защищенные платежные системы. Мы не храним данные ваших банковских карт.',
  },
  {
    category: 'Гиды',
    question: 'Кто проводит туры?',
    answer: 'Все наши туры проводят профессиональные гиды с большим опытом работы и глубокими знаниями истории, культуры и природы Татарстана.',
  },
  {
    category: 'Гиды',
    question: 'На каком языке проводятся туры?',
    answer: 'Туры проводятся на русском языке. По запросу возможна организация туров на татарском или английском языке (уточняйте при бронировании).',
  },
  {
    category: 'Погода',
    question: 'Что делать, если погода плохая?',
    answer: 'Большинство наших туров проводятся в любую погоду. Если погодные условия делают тур невозможным, мы свяжемся с вами заранее и предложим альтернативу или перенос даты.',
  },
  {
    category: 'Другое',
    question: 'Как связаться с поддержкой?',
    answer: 'Вы можете связаться с нами через онлайн-чат на сайте (круглосуточно), по телефону +7 995 133-47-82, по email Daniel-Mini@rambler.ru или через мессенджеры (VK, Telegram).',
  },
  {
    category: 'Другое',
    question: 'Есть ли скидки для групп?',
    answer: 'Да, мы предоставляем скидки для групповых бронирований. Размер скидки зависит от количества участников. Свяжитесь с нами для уточнения условий.',
  },
  {
    category: 'Другое',
    question: 'Можно ли организовать индивидуальный тур?',
    answer: 'Да, мы можем организовать индивидуальный тур по вашему запросу. Свяжитесь с нами, и мы обсудим маршрут, даты и стоимость.',
  },
];

const categories = ['Все', 'Бронирование', 'Туры', 'Оплата', 'Гиды', 'Погода', 'Другое'];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');

  const filteredFAQs = selectedCategory === 'Все' 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 px-4 py-2 mb-6">
              <HelpCircle className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-wider">FAQ</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 sm:mb-6 leading-tight">
              Часто задаваемые вопросы
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 leading-relaxed font-medium">
              Найдите ответы на популярные вопросы о наших турах, бронировании и услугах
            </p>
          </div>
        </div>
      </section>

      {/* Основной контент */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        {/* Фильтр по категориям */}
        <div className="mb-8 sm:mb-12">
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-emerald-600 text-white shadow-lg scale-105'
                    : 'bg-white text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 border-2 border-gray-200 hover:border-emerald-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ список */}
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {filteredFAQs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-200 hover:border-emerald-300 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 sm:px-8 py-4 sm:py-6 flex items-center justify-between text-left hover:bg-emerald-50 transition-colors"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs sm:text-sm font-bold">
                      {faq.category}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-900">
                    {faq.question}
                  </h3>
                </div>
                <div className="flex-shrink-0">
                  {openIndex === index ? (
                    <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                  )}
                </div>
              </button>
              {openIndex === index && (
                <div className="px-6 sm:px-8 pb-4 sm:pb-6 border-t border-gray-100">
                  <p className="pt-4 sm:pt-6 text-sm sm:text-base md:text-lg text-gray-700 leading-relaxed font-medium">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Не нашли ответ? */}
        <section className="mt-12 sm:mt-16 md:mt-20">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-10 lg:p-12 border-2 border-emerald-200">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-emerald-600 rounded-full mb-6">
                <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 mb-4 sm:mb-6">
                Не нашли ответ на свой вопрос?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-700 mb-6 sm:mb-8 font-medium leading-relaxed">
                Свяжитесь с нами любым удобным способом, и мы с радостью ответим на все ваши вопросы
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href="tel:+79951334782"
                  className="inline-flex items-center gap-2 sm:gap-3 bg-emerald-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  <Phone className="w-5 h-5" />
                  Позвонить
                </a>
                <a
                  href="mailto:Daniel-Mini@rambler.ru"
                  className="inline-flex items-center gap-2 sm:gap-3 bg-white text-emerald-600 border-2 border-emerald-600 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg hover:bg-emerald-50 transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  Написать email
                </a>
                <Link
                  href="/contacts"
                  className="inline-flex items-center gap-2 sm:gap-3 bg-gray-100 text-gray-700 border-2 border-gray-200 px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg hover:bg-gray-200 transition-colors"
                >
                  Все контакты
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

