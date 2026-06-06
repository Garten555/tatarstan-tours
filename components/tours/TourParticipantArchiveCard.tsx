import { Calendar, CheckCircle2 } from 'lucide-react';

import { formatDateTimeShortRu } from '@/lib/date/format-ru';

type TourParticipantArchiveCardProps = {
  startDate: string | null;
  endDate?: string | null;
};

/** Боковая карточка на странице тура для участника прошедшего выезда. */
export default function TourParticipantArchiveCard({
  startDate,
  endDate,
}: TourParticipantArchiveCardProps) {
  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <p className="text-lg font-black text-gray-900">Вы участвовали в этом туре</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            Это архивная страница вашего выезда — описание, фото и отзывы доступны для просмотра.
            Новая запись открывается только если в каталоге появится следующая дата.
          </p>
          {startDate ? (
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <span>
                Ваш выезд: {formatDateTimeShortRu(startDate)}
                {endDate ? ` — ${formatDateTimeShortRu(endDate)}` : ''}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
