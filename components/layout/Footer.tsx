'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { MapPin, Phone, Mail } from 'lucide-react';

type FooterCity = {
  id: string;
  name: string;
};

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [cities, setCities] = useState<FooterCity[]>([]);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const response = await fetch('/api/cities/featured?limit=6');
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data?.cities)) {
          setCities(data.cities);
        }
      } catch {
        // Silent fail for footer links
      }
    };

    loadCities();
  }, []);

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 sm:px-5 md:px-6 lg:px-8 py-12 sm:py-16 md:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 md:gap-12">
          {/* Информация о компании */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
              <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-2.5 flex-shrink-0">
                <Logo className="w-10 h-10 sm:w-12 sm:h-12" />
              </div>
              <span className="text-white font-bold text-lg sm:text-xl md:text-2xl">
                Татарстан тур
              </span>
            </div>
            <p className="text-sm sm:text-base md:text-lg text-gray-400 leading-relaxed mb-6 sm:mb-8">
              Откройте для себя красоту и культуру Татарстана с нашими уникальными турами
            </p>
            {/* Социальные сети */}
            <div className="flex space-x-5">
              <a
                href="https://vk.com/id563822679"
                target="_blank"
                rel="noreferrer"
                className="footer-social-link text-gray-400 hover:text-emerald-400 transition-colors p-2 hover:bg-gray-800 rounded-lg"
                aria-label="VK"
                style={{ color: 'rgb(156 163 175)' }}
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'inherit' }}>
                  <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.71-1.033-1.004-1.49-1.14-1.747-1.14-.356 0-.458.102-.458.593v1.563c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.271.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.491-.085.744-.576.744z"/>
                </svg>
              </a>
              <a
                href="https://t.me/Vbhhhhhggy"
                target="_blank"
                rel="noreferrer"
                className="footer-social-link text-gray-400 hover:text-emerald-400 transition-colors p-2 hover:bg-gray-800 rounded-lg"
                aria-label="Telegram"
                style={{ color: 'rgb(156 163 175)' }}
              >
                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'inherit' }}>
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Быстрые ссылки */}
          <div>
            <h3 className="text-white font-bold text-lg sm:text-xl md:text-2xl mb-4 sm:mb-6">Быстрые ссылки</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="/tours" className="footer-link text-gray-400 hover:text-emerald-400 transition-colors text-sm sm:text-base md:text-lg font-medium">
                  Все туры
                </Link>
              </li>
              <li>
                <Link href="/about" className="footer-link text-gray-400 hover:text-emerald-400 transition-colors text-sm sm:text-base md:text-lg font-medium">
                  О компании
                </Link>
              </li>
              <li>
                <Link href="/contacts" className="footer-link text-gray-400 hover:text-emerald-400 transition-colors text-sm sm:text-base md:text-lg font-medium">
                  Контакты
                </Link>
              </li>
              <li>
                <Link href="/faq" className="footer-link text-gray-400 hover:text-emerald-400 transition-colors text-sm sm:text-base md:text-lg font-medium">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Города */}
          <div>
            <h3 className="text-white font-bold text-lg sm:text-xl md:text-2xl mb-4 sm:mb-6">Города</h3>
            {cities.length > 0 ? (
              <ul className="space-y-2 sm:space-y-3">
                {cities.map((city) => (
                  <li key={city.id}>
                    <Link
                      href={`/tours?city_id=${city.id}`}
                      className="footer-link text-gray-400 hover:text-emerald-400 transition-colors text-sm sm:text-base md:text-lg font-medium"
                    >
                      {city.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm sm:text-base md:text-lg text-gray-500">
                Города появятся после публикации туров
              </p>
            )}
          </div>

          {/* Контактная информация */}
          <div>
            <h3 className="text-white font-bold text-lg sm:text-xl md:text-2xl mb-4 sm:mb-6">Контакты</h3>
            <ul className="space-y-3 sm:space-y-4">
              <li className="flex items-start space-x-2 sm:space-x-3">
                <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 mt-0.5 sm:mt-1 flex-shrink-0" />
                <span className="text-gray-400 text-sm sm:text-base md:text-lg font-medium leading-relaxed">г. Набережные Челны, Нур-Баян, Д. 28</span>
              </li>
              <li className="flex items-center space-x-2 sm:space-x-3">
                <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 flex-shrink-0" />
                <a href="tel:+79951334782" className="footer-link text-gray-400 hover:text-emerald-400 transition-colors text-sm sm:text-base md:text-lg font-medium">
                  +7 995 133-47-82
                </a>
              </li>
              <li className="flex items-center space-x-2 sm:space-x-3">
                <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 flex-shrink-0" />
                <a href="mailto:Daniel-Mini@rambler.ru" className="footer-link text-gray-400 hover:text-emerald-400 transition-colors text-sm sm:text-base md:text-lg font-medium break-all">
                  Daniel-Mini@rambler.ru
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Нижняя панель */}
        <div className="border-t border-gray-800 mt-8 sm:mt-12 pt-6 sm:pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <p className="text-sm sm:text-base md:text-lg text-gray-400 font-medium text-center sm:text-left">
            © {currentYear} Татарстан тур. Все права защищены.
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <Link href="/privacy" className="footer-link text-sm sm:text-base md:text-lg text-gray-400 hover:text-emerald-400 transition-colors font-medium">
              Политика конфиденциальности
            </Link>
            <Link href="/terms" className="footer-link text-sm sm:text-base md:text-lg text-gray-400 hover:text-emerald-400 transition-colors font-medium">
              Условия использования
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
