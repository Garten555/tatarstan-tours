/** Общий бренд и вёрстка HTML-писем приложения. */

export const EMAIL_BRAND_NAME = 'Туры по Татарстану';

export type EmailTheme = 'brand' | 'success' | 'danger' | 'warning';

const THEME_STYLES: Record<
  EmailTheme,
  { headerFrom: string; headerTo: string; accent: string; boxBorder: string }
> = {
  brand: {
    headerFrom: '#10b981',
    headerTo: '#059669',
    accent: '#059669',
    boxBorder: '#10b981',
  },
  success: {
    headerFrom: '#10b981',
    headerTo: '#059669',
    accent: '#059669',
    boxBorder: '#10b981',
  },
  danger: {
    headerFrom: '#ef4444',
    headerTo: '#dc2626',
    accent: '#dc2626',
    boxBorder: '#ef4444',
  },
  warning: {
    headerFrom: '#f59e0b',
    headerTo: '#d97706',
    accent: '#b45309',
    boxBorder: '#f59e0b',
  },
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readRawEmailAddress(): string | undefined {
  const raw = (
    process.env.RESEND_FROM ||
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    process.env.MAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    process.env.MAIL_USER
  )?.trim();

  if (!raw) return undefined;

  const angleMatch = raw.match(/<([^>]+)>/);
  if (angleMatch) return angleMatch[1].trim();

  return raw;
}

function readEmailFromName(): string {
  return (
    process.env.MAIL_FROM_NAME ||
    process.env.EMAIL_FROM_NAME ||
    process.env.SMTP_FROM_NAME ||
    EMAIL_BRAND_NAME
  ).trim();
}

/** Адрес отправителя для SMTP / Resend: «Туры по Татарстану» <email@…> */
export function formatEmailFrom(): string | undefined {
  const email = readRawEmailAddress();
  if (!email) return undefined;
  const name = readEmailFromName();
  return `"${name}" <${email}>`;
}

function readSiteUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!url) return undefined;
  return url.replace(/\/$/, '');
}

export function wrapEmailLayout(options: {
  headline: string;
  theme?: EmailTheme;
  bodyHtml: string;
}): string {
  const theme = options.theme ?? 'brand';
  const styles = THEME_STYLES[theme];
  const siteUrl = readSiteUrl();
  const headline = escapeHtml(options.headline);

  const brandLine = siteUrl
    ? `<a href="${escapeHtml(siteUrl)}" style="color:#059669;text-decoration:none;font-weight:600;">${escapeHtml(EMAIL_BRAND_NAME)}</a>`
    : escapeHtml(EMAIL_BRAND_NAME);

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2f7;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,${styles.headerFrom} 0%,${styles.headerTo} 100%);padding:28px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;color:rgba(255,255,255,0.85);">${escapeHtml(EMAIL_BRAND_NAME)}</p>
              <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#ffffff;">${headline}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;background:#f9fafb;">
              ${options.bodyHtml}
              <p style="margin:32px 0 0;padding-top:24px;border-top:1px solid #e5e7eb;text-align:center;font-size:13px;color:#6b7280;">
                С уважением,<br>${brandLine}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailParagraph(html: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#374151;">${html}</p>`;
}

export function emailInfoBox(title: string, innerHtml: string, theme: EmailTheme = 'brand'): string {
  const styles = THEME_STYLES[theme];
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#ffffff;border-radius:8px;border-left:4px solid ${styles.boxBorder};">
    <tr>
      <td style="padding:20px 22px;">
        <h2 style="margin:0 0 12px;font-size:17px;color:${styles.accent};">${escapeHtml(title)}</h2>
        ${innerHtml}
      </td>
    </tr>
  </table>`;
}

export function emailDetailRow(label: string, value: string): string {
  return `<p style="margin:0 0 8px;font-size:15px;color:#374151;"><strong style="color:#111827;">${escapeHtml(label)}:</strong> ${value}</p>`;
}

export function emailAlert(message: string, variant: 'info' | 'success' | 'warning' | 'danger'): string {
  const palette = {
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    danger: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
  }[variant];

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td style="padding:14px 16px;background:${palette.bg};border-left:4px solid ${palette.border};border-radius:6px;font-size:14px;color:${palette.text};">
        ${message}
      </td>
    </tr>
  </table>`;
}

export function emailButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 0;">
    <tr>
      <td style="border-radius:8px;background:#10b981;">
        <a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
          ${safeLabel}
        </a>
      </td>
    </tr>
  </table>`;
}

export function emailCodeBox(code: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td align="center" style="padding:28px 20px;background:#ffffff;border:2px solid #10b981;border-radius:8px;">
        <p style="margin:0 0 10px;font-size:14px;color:#6b7280;">Ваш код:</p>
        <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:8px;color:#059669;font-family:'Courier New',Courier,monospace;">${escapeHtml(code)}</p>
      </td>
    </tr>
  </table>`;
}

export function emailDataTable(rows: Array<{ label: string; value: string }>): string {
  const cells = rows
    .map(
      (row) =>
        `<tr>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-size:14px;color:#6b7280;width:35%;">${escapeHtml(row.label)}</td>
          <td style="padding:10px 12px;border:1px solid #e5e7eb;font-size:14px;color:#111827;">${row.value}</td>
        </tr>`
    )
    .join('');

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border-collapse:collapse;">${cells}</table>`;
}
