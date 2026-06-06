import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail, getBookingConfirmationEmail } from '@/lib/email/send-email';

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
}): Promise<{ sent: boolean; recipients: string[] }> {
  const { serviceClient, userId, authEmail, tourId, sessionStartAt, numPeople, totalPrice } =
    params;

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
    return { sent: false, recipients: [] };
  }

  const userName =
    (profile as { first_name?: string | null; last_name?: string | null } | null)?.first_name &&
    (profile as { first_name?: string | null; last_name?: string | null } | null)?.last_name
      ? `${(profile as { first_name: string }).first_name} ${(profile as { last_name: string }).last_name}`
      : recipient;

  const dateSource = sessionStartAt || tour.start_date;
  const tourDate = dateSource ? formatTourDate(dateSource) : 'уточняется';

  const html = getBookingConfirmationEmail(
    userName,
    tour.title,
    tourDate,
    numPeople,
    parseFloat(String(totalPrice))
  );

  const ok = await sendEmail({
    to: recipient,
    subject: `Бронирование подтверждено: ${tour.title}`,
    html,
  });

  if (!ok) {
    console.error('[booking-email] sendEmail returned false for', recipient);
  }

  return { sent: ok, recipients: ok ? [recipient] : [] };
}
