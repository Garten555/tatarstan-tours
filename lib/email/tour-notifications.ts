import { sendEmail } from '@/lib/email/send-email';
import {
  getTourCancelledEmail,
  getTourRemovedEmail,
  getTourRescheduleEmail,
} from '@/lib/email/email-templates';

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
  const html = getTourRescheduleEmail({
    tourTitle: opts.tourTitle,
    oldRange: `${formatRuDateTime(opts.oldStart)} — ${formatRuDateTime(opts.oldEnd || opts.oldStart)}`,
    newRange: `${formatRuDateTime(opts.newStart)} — ${formatRuDateTime(opts.newEnd || opts.newStart)}`,
  });

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
  departureLabel?: string;
}): Promise<boolean> {
  const html = getTourCancelledEmail({
    tourTitle: opts.tourTitle,
    reason: opts.reason,
    departureLabel: opts.departureLabel,
  });

  return sendEmail({
    to: opts.to,
    subject: `Отмена тура: ${opts.tourTitle}`,
    html,
  });
}

export async function sendTourRemovedEmail(opts: { to: string; tourTitle: string }): Promise<boolean> {
  return sendEmail({
    to: opts.to,
    subject: `Тур снят с продажи: ${opts.tourTitle}`,
    html: getTourRemovedEmail(opts.tourTitle),
  });
}
