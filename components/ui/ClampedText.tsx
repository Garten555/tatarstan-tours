import type { ElementType, ReactNode } from 'react';

type Lines = 1 | 2 | 3 | 4;

const LINE_CLAMP: Record<Lines, string> = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
};

export type ClampedTextProps = {
  as?: ElementType;
  lines?: Lines;
  className?: string;
  children: ReactNode;
  /** Сжимает пробелы и переносы строк — иначе «грязный» текст ломает line-clamp. */
  collapseWhitespace?: boolean;
};

/**
 * Единый блок для обрезки многострочного текста с многоточием (Tailwind line-clamp).
 * В flex/grid обязательно сочетать с min-w-0 у предков там, где раньше текст «вылезал».
 */
export default function ClampedText({
  as,
  lines = 2,
  className = '',
  children,
  collapseWhitespace = false,
}: ClampedTextProps) {
  const Tag = (as || 'p') as ElementType;
  const clamp = LINE_CLAMP[lines] ?? LINE_CLAMP[2];
  const base =
    'min-w-0 max-w-full break-words overflow-hidden [overflow-wrap:anywhere] ' + clamp;

  const content =
    collapseWhitespace && typeof children === 'string'
      ? children.replace(/\s+/g, ' ').trim()
      : children;

  return <Tag className={`${base} ${className}`.trim()}>{content}</Tag>;
}
