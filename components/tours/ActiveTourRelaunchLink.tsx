import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import type { ActiveTourLink } from '@/lib/tours/resolve-active-tour-link';

type ActiveTourRelaunchLinkProps = {
  link: ActiveTourLink;
  className?: string;
  buttonClassName?: string;
};

function formatParticipatedDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Кнопка на активный экземпляр тура с пояснением про прошедший выезд. */
export function ActiveTourRelaunchLink({
  link,
  className = '',
  buttonClassName = '',
}: ActiveTourRelaunchLinkProps) {
  return (
    <div className={className}>
      <Link
        href={`/tours/${link.slug}`}
        className={
          buttonClassName ||
          'inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-700'
        }
      >
        Посмотреть тур
        <ExternalLink className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      </Link>
      {link.isRelaunched && link.participatedAt ? (
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          Ваш выезд был {formatParticipatedDate(link.participatedAt)} — открыта запись на тот же
          маршрут в другую дату.
        </p>
      ) : link.isRelaunched ? (
        <p className="mt-2 text-xs leading-relaxed text-gray-500">
          Этот маршрут снова доступен для записи на новую дату.
        </p>
      ) : null}
    </div>
  );
}
