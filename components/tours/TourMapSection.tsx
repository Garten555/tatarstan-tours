import { MapPin } from 'lucide-react';
import { sanitizeMapEmbedHtml, sanitizeMapIframeUrl } from '@/lib/utils/sanitize';

type TourMapSectionProps = {
  yandexMapUrl: string;
};

export default function TourMapSection({ yandexMapUrl }: TourMapSectionProps) {
  const iframeHtml = yandexMapUrl.includes('<iframe')
    ? sanitizeMapEmbedHtml(yandexMapUrl)
    : '';
  const iframeSrc = !yandexMapUrl.includes('<iframe')
    ? sanitizeMapIframeUrl(yandexMapUrl)
    : null;

  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 md:p-8 hover:shadow-xl transition-all duration-300 w-full max-w-full overflow-hidden">
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-gray-900 mb-6 md:mb-8 pb-4 border-b-2 border-gray-200 flex items-center gap-3">
        <div className="p-3 bg-emerald-100 rounded-xl">
          <MapPin className="w-6 h-6 md:w-7 md:h-7 text-emerald-600" />
        </div>
        Место проведения
      </h2>
      <div className="relative w-full h-80 md:h-96 lg:h-[500px] rounded-xl overflow-hidden shadow-xl border-2 border-gray-200">
        {yandexMapUrl.includes('<iframe') ? (
          iframeHtml ? (
            <div
              dangerouslySetInnerHTML={{ __html: iframeHtml }}
              className="w-full h-full max-w-full"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500 text-sm px-4 text-center">
              Карта не может быть отображена (недопустимый код вставки).
            </div>
          )
        ) : iframeSrc ? (
          <iframe src={iframeSrc} className="w-full h-full max-w-full border-0" allowFullScreen />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-500 text-sm px-4 text-center">
            Карта не может быть отображена (недопустимый URL).
          </div>
        )}
      </div>
    </section>
  );
}

