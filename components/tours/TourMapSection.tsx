import { MapPin } from 'lucide-react';

type TourMapSectionProps = {
  yandexMapUrl: string;
};

export default function TourMapSection({ yandexMapUrl }: TourMapSectionProps) {
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
          <div
            dangerouslySetInnerHTML={{ __html: yandexMapUrl }}
            className="w-full h-full max-w-full"
          />
        ) : (
          <iframe src={yandexMapUrl} className="w-full h-full max-w-full border-0" allowFullScreen />
        )}
      </div>
    </section>
  );
}

