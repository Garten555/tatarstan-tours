import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail, getBookingConfirmationEmail, isSmtpConfigured } from '@/lib/email/send-email';

function formatTourDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function sendBookingConfirmationEmail(params: {
  serviceClient: SupabaseClient;
  userId: string;
  authEmail?: string | null;
  tourId: string;
  sessionStartAt?: string | null;
  numPeople: number;
  totalPrice: number;
  paymentStatus?: 'pending' | 'paid' | string | null;
}): Promise<{ sent: boolean; recipients: string[]; reason?: string }> {
  const {
    serviceClient,
    userId,
    authEmail,
    tourId,
    sessionStartAt,
    numPeople,
    totalPrice,
    paymentStatus,
  } = params;

  if (!isSmtpConfigured()) {
    console.error('[booking-email] SMTP not configured (EMAIL_USER/EMAIL_PASSWORD on server)');
    return { sent: false, recipients: [], reason: 'smtp_not_configured' };
  }

  const [{ data: profile }, { data: tour }] = await Promise.all([
    serviceClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single(),
    serviceClient.from('tours').select('title, start_date').eq('id', tourId).single(),
  ]);

  if (!tour?.title) {
    console.error('[booking-email] tour not found:', tourId);
    return { sent: false, recipients: [] };
  }

  const profileEmail = (profile as { email?: string | null } | null)?.email?.trim();
  const recipient = profileEmail || authEmail?.trim() || null;

  if (!recipient) {
    console.error('[booking-email] no recipient email for user', userId);
    return { sent: false, recipients: [], reason: 'no_recipient' };
  }

  const userName =
    (profile as { first_name?: string | null; last_name?: string | null } | null)?.first_name &&
    (profile as { first_name?: string | null; last_name?: string | null } | null)?.last_name
      ? `${(profile as { first_name: string }).first_name} ${(profile as { last_name: string }).last_name}`
      : recipient;

  const dateSource = sessionStartAt || tour.start_date;
  const tourDate = dateSource ? formatTourDate(dateSource) : 'уточняется';

  const pendingPayment = paymentStatus === 'pending';
  const html = getBookingConfirmationEmail(
    userName,
    tour.title,
    tourDate,
    numPeople,
    parseFloat(String(totalPrice)),
    { pendingPayment }
  );

  const subject = pendingPayment
    ? `Заявка на бронирование: ${tour.title}`
    : `Бронирование подтверждено: ${tour.title}`;

  const ok = await sendEmail({
    to: recipient,
    subject,
    html,
  });

  if (!ok) {
    console.error('[booking-email] sendEmail returned false for', recipient);
  }

  return { sent: ok, recipients: ok ? [recipient] : [] };
}
