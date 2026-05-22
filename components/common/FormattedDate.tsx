'use client';

import {
  formatDateRu,
  formatDateTimeRu,
  formatDateTimeShortRu,
  formatDayMonthRu,
} from '@/lib/date/format-ru';

type Variant = 'datetime' | 'date' | 'short' | 'day-month';

type Props = {
  value: string | Date | null | undefined;
  variant?: Variant;
  className?: string;
};

function format(value: string | Date | null | undefined, variant: Variant): string {
  switch (variant) {
    case 'date':
      return formatDateRu(value);
    case 'short':
      return formatDateTimeShortRu(value);
    case 'day-month':
      return formatDayMonthRu(value);
    default:
      return formatDateTimeRu(value);
  }
}

/** Дата/время с фиксированной TZ — совпадает при SSR и гидратации. */
export default function FormattedDate({ value, variant = 'datetime', className }: Props) {
  const text = format(value, variant);
  if (!text) return null;
  return <span className={className}>{text}</span>;
}
