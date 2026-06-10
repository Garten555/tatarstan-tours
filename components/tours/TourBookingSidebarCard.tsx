import { Calendar, CheckCircle2, Clock } from 'lucide-react';

import { formatDateTimeShortRu } from '@/lib/date/format-ru';

type TourBookingSidebarCardProps = {
  startDate: string | null;
  endDate?: string | null;
  /** staff — просмотр админом чужой брони */
  variant?: 'participant' | 'staff';
  /** archive — выезд прошёл; upcoming — предстоящий */
  mode?: 'archive' | 'upcoming';
};

export default function TourBookingSidebarCard({
  startDate,
  endDate,
  variant = 'participant',
  mode = 'archive',
}: TourBookingSidebarCardProps) {
  const isStaff = variant === 'staff';
  const isArchive = mode === 'archive';
  const Icon = isArchive ? CheckCircle2 : Clock;

  const title = isArchive
    ? isStaff
      ? 'Архивный выезд по бронированию'
      : 'Вы участвовали в этом туре'
    : isStaff
      ? 'Бронирование на этот выезд'
      : 'Ваш предстоящий выезд';

  const description = isArchive
    ? isStaff
      ? 'Страница тура в контексте этого бронирования. Даты других выездов и запись на новый слот здесь не показываются.'
      : 'Архивная страница вашего выезда — описание, фото и отзывы для просмотра.'
    : isStaff
      ? 'Просмотр тура в контексте выбранного бронирования. Это не публичная страница записи на другие даты.'
      : 'Вы записаны на этот выезд. Ниже — описание тура; запись на другие даты открыта отдельно в каталоге.';

  const dateLabel = isStaff ? 'Выезд по брони' : 'Ваш выезд';

  return (
    <div
      className={`rounded-2xl border-2 p-6 shadow-lg ${
        isArchive
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
          : 'border-blue-200 bg-gradient-to-br from-blue-50 to-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${
            isArchive ? 'bg-emerald-600' : 'bg-blue-600'
          }`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-lg font-black text-gray-900">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{description}</p>
          {startDate ? (
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
              <Calendar className={`h-4 w-4 ${isArchive ? 'text-emerald-600' : 'text-blue-600'}`} />
              <span>
                {dateLabel}: {formatDateTimeShortRu(startDate)}
                {endDate ? ` — ${formatDateTimeShortRu(endDate)}` : ''}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
