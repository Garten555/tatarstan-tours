'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { sanitizeMapEmbedHtml, sanitizeMapIframeUrl } from '@/lib/utils/sanitize';

type TourMapSectionProps = {
  yandexMapUrl: string;
};

export default function TourMapSection({ yandexMapUrl }: TourMapSectionProps) {
  const [mapVisible, setMapVisible] = useState(false);

  const iframeHtml = yandexMapUrl.includes('<iframe')
    ? sanitizeMapEmbedHtml(yandexMapUrl)
    : '';
  const iframeSrc = !yandexMapUrl.includes('<iframe')
    ? sanitizeMapIframeUrl(yandexMapUrl)
    : null;

  const hasMap =
    (yandexMapUrl.includes('<iframe') && !!iframeHtml) || (!yandexMapUrl.includes('<iframe') && !!iframeSrc);

  const invalidMessage = yandexMapUrl.includes('<iframe')
    ? 'Карта не может быть отображена (недопустимый код вставки).'
    : 'Карта не может быть отображена (недопустимый URL).';

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 md:p-8 hover:shadow-xl transition-all duration-300 w-full max-w-full overflow-hidden">
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 mb-6 md:mb-8 pb-4 border-b-2 border-gray-200 flex items-center gap-3">
        <div className="p-3 bg-emerald-100 rounded-xl">
          <MapPin className="w-6 h-6 md:w-7 md:h-7 text-emerald-600" />
        </div>
        Место проведения
      </h2>
      <div className="relative w-full h-80 md:h-96 lg:h-[500px] rounded-xl overflow-hidden shadow-xl border-2 border-gray-200">
        {!hasMap ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gray-100 px-4 text-center text-gray-500 text-sm">
            {invalidMessage}
          </div>
        ) : !mapVisible ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-emerald-50 via-gray-50 to-teal-50 px-6 text-center">
            <MapPin className="h-12 w-12 text-emerald-600 opacity-90" aria-hidden />
            <p className="max-w-md text-gray-700 text-sm md:text-base leading-relaxed">
              Карту загружает Яндекс. Чтобы не подтягивать её скрипты до нужды и не засорять консоль блокировщиками трекинга,
              показываем её только после вашего действия.
            </p>
            <button
              type="button"
              onClick={() => setMapVisible(true)}
              className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-3.5 text-white font-semibold shadow-lg shadow-emerald-500/30 hover:from-emerald-700 hover:to-teal-700 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              Показать карту
            </button>
          </div>
        ) : yandexMapUrl.includes('<iframe') ? (
          iframeHtml ? (
            <div
              dangerouslySetInnerHTML={{ __html: iframeHtml }}
              className="w-full h-full max-w-full [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:min-h-[320px] [&_iframe]:border-0"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500 text-sm px-4 text-center">
              {invalidMessage}
            </div>
          )
        ) : iframeSrc ? (
          <iframe
            title="Карта места проведения"
            src={iframeSrc}
            className="w-full h-full max-w-full border-0"
            allowFullScreen
          />
        ) : null}
      </div>
    </section>
  );
}
