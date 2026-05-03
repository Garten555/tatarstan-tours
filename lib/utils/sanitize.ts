/**
 * Утилиты для защиты от XSS атак
 * Санитизация HTML и текстовых данных
 */

import sanitizeHtml from 'sanitize-html';

/** Хосты для iframe карт (выровнено с lib/security/csp.ts frame-src). */
export function isTrustedMapEmbedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  const roots = [
    'yandex.ru',
    'yandex.com',
    'google.com',
    'google.ru',
    'googleusercontent.com',
    '2gis.ru',
    '2gis.com',
  ];
  return roots.some((root) => h === root || h.endsWith(`.${root}`));
}

function iframeTransformTag(_tagName: string, attribs: Record<string, string>) {
  const src = attribs.src?.trim() || '';
  try {
    const u = new URL(src);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      return { tagName: 'span', attribs: {}, text: '' };
    }
    if (!isTrustedMapEmbedHostname(u.hostname)) {
      return { tagName: 'span', attribs: {}, text: '' };
    }
    return {
      tagName: 'iframe',
      attribs: {
        src: u.href,
        width: attribs.width || '100%',
        height: attribs.height || '400',
        frameborder: '0',
        loading: 'lazy',
        referrerpolicy: 'strict-origin-when-cross-origin',
        allowfullscreen: '',
      },
    };
  } catch {
    return { tagName: 'span', attribs: {}, text: '' };
  }
}

const RICH_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'img',
    'h1',
    'h2',
    'h3',
    'h4',
    'figure',
    'figcaption',
    'iframe',
    'div',
    'span',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'colgroup',
    'col',
    'hr',
    'abbr',
    'bdi',
    'bdo',
    'cite',
    'dfn',
    'kbd',
    'mark',
    'q',
    's',
    'samp',
    'small',
    'sub',
    'sup',
    'time',
    'var',
    'wbr',
    'del',
    'ins',
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    img: ['src', 'alt', 'width', 'height', 'class', 'loading', 'decoding'],
    a: ['href', 'name', 'target', 'rel', 'class'],
    div: ['class'],
    span: ['class'],
    p: ['class'],
    iframe: [
      'src',
      'width',
      'height',
      'frameborder',
      'allowfullscreen',
      'loading',
      'referrerpolicy',
      'title',
      'class',
    ],
    table: ['class'],
    td: ['colspan', 'rowspan', 'class'],
    th: ['colspan', 'rowspan', 'class'],
    figure: ['class'],
    figcaption: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https'],
  },
  transformTags: {
    a: (_tagName: string, attribs: Record<string, string>) => {
      const href = (attribs.href || '').trim();
      if (/^\s*javascript:/i.test(href) || /^\s*data:/i.test(href)) {
        return { tagName: 'span', attribs: {}, text: '' };
      }
      return {
        tagName: 'a',
        attribs: {
          ...attribs,
          rel: 'noopener noreferrer',
          target: attribs.target === '_blank' ? '_blank' : attribs.target || '',
        },
      };
    },
    iframe: iframeTransformTag as sanitizeHtml.Transformer,
  },
};

/**
 * HTML из редакторов (блог, туры, дневники): без script/on*, только безопасные теги и карты с доверенных доменов.
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return '';
  return sanitizeHtml(html, RICH_HTML_OPTIONS);
}

/** Фрагмент с iframe карты (или обёрткой div), как в админке тура / посте. */
export function sanitizeMapEmbedHtml(html: string | null | undefined): string {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: ['iframe', 'div'],
    allowedAttributes: {
      iframe: [
        'src',
        'width',
        'height',
        'frameborder',
        'allowfullscreen',
        'loading',
        'referrerpolicy',
        'title',
      ],
      div: ['class'],
    },
    transformTags: {
      iframe: iframeTransformTag as sanitizeHtml.Transformer,
    },
  });
}

/** Прямой URL iframe карты (не HTML). */
export function sanitizeMapIframeUrl(url: string | null | undefined): string | null {
  const base = sanitizeUrl(url);
  if (!base) return null;
  try {
    const u = new URL(base);
    if (!isTrustedMapEmbedHostname(u.hostname)) return null;
    return u.href;
  } catch {
    return null;
  }
}

/**
 * Экранирует HTML символы для безопасного отображения
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
  };
  
  return String(text).replace(/[&<>"'/]/g, (char) => map[char] || char);
}

/**
 * Санитизирует текст, удаляя потенциально опасные символы
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  
  return escapeHtml(text)
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/<script/gi, '&lt;script')
    .replace(/<\/script>/gi, '&lt;/script&gt;')
    .trim();
}

/**
 * Безопасно обрезает текст до указанной длины
 */
export function safeTruncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  const sanitized = sanitizeText(text);
  if (sanitized.length <= maxLength) return sanitized;
  return sanitized.slice(0, maxLength) + '...';
}

/**
 * Валидирует URL для безопасного использования
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    // Разрешаем только http и https протоколы
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Безопасный URL для изображений/аватаров.
 * Разрешаем только http/https и optional hostname allowlist (если задан).
 */
export function sanitizeImageUrl(
  url: string | null | undefined,
  allowedHosts?: string[]
): string | null {
  const safe = sanitizeUrl(url);
  if (!safe) return null;
  if (!allowedHosts || allowedHosts.length === 0) return safe;
  try {
    const parsed = new URL(safe);
    return allowedHosts.includes(parsed.hostname) ? safe : null;
  } catch {
    return null;
  }
}

/**
 * Безопасно извлекает текст из HTML (удаляет все теги)
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}































