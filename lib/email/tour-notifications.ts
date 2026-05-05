import { sendEmail } from '@/lib/email/send-email';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatRuDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

export async function sendTourRescheduleEmail(opts: {
  to: string;
  tourTitle: string;
  oldStart: string;
  oldEnd: string | null;
  newStart: string;
  newEnd: string | null;
}): Promise<boolean> {
  const title = escapeHtml(opts.tourTitle);
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color:#047857;">Перенос дат тура</h2>
      <p>Здравствуйте!</p>
      <p>Изменились даты выезда по туру <strong>${title}</strong>.</p>
      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        <tr><td style="padding:8px; border:1px solid #e5e7eb;">Было</td><td style="padding:8px; border:1px solid #e5e7eb;">
          ${escapeHtml(formatRuDateTime(opts.oldStart))} — ${escapeHtml(formatRuDateTime(opts.oldEnd || opts.oldStart))}
        </td></tr>
        <tr><td style="padding:8px; border:1px solid #e5e7eb;">Стало</td><td style="padding:8px; border:1px solid #e5e7eb;">
          ${escapeHtml(formatRuDateTime(opts.newStart))} — ${escapeHtml(formatRuDateTime(opts.newEnd || opts.newStart))}
        </td></tr>
      </table>
      <p style="color:#6b7280; font-size:14px;">Если у вас есть вопросы, ответьте на это письмо или напишите в поддержку на сайте.</p>
    </div>
  `;
  return sendEmail({
    to: opts.to,
    subject: `Перенос тура: ${opts.tourTitle}`,
    html,
  });
}

export async function sendTourCancelledEmail(opts: {
  to: string;
  tourTitle: string;
  reason?: string;
}): Promise<boolean> {
  const title = escapeHtml(opts.tourTitle);
  const reasonBlock =
    opts.reason && opts.reason.trim()
      ? `<p><strong>Причина:</strong> ${escapeHtml(opts.reason.trim())}</p>`
      : '';
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color:#b91c1c;">Тур отменён</h2>
      <p>Здравствуйте!</p>
      <p>Тур <strong>${title}</strong> был отменён организатором.</p>
      ${reasonBlock}
      <p style="color:#6b7280; font-size:14px;">Бронирование аннулировано. По возврату средств или замене тура мы свяжемся с вами при необходимости.</p>
    </div>
  `;
  return sendEmail({
    to: opts.to,
    subject: `Отмена тура: ${opts.tourTitle}`,
    html,
  });
}

export async function sendTourRemovedEmail(opts: { to: string; tourTitle: string }): Promise<boolean> {
  const title = escapeHtml(opts.tourTitle);
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color:#b45309;">Тур удалён с площадки</h2>
      <p>Здравствуйте!</p>
      <p>Тур <strong>${title}</strong> был удалён администратором. Ваша запись на этот тур больше не действует.</p>
      <p style="color:#6b7280; font-size:14px;">При вопросах обратитесь в поддержку сайта.</p>
    </div>
  `;
  return sendEmail({
    to: opts.to,
    subject: `Тур снят с продажи: ${opts.tourTitle}`,
    html,
  });
}
