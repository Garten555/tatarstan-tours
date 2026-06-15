import type { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeText } from '@/lib/utils/sanitize';
import { getEffectiveBookingStatus, type BookingForReview } from '@/lib/bookings/review-eligibility';

const BOOKING_SELECT = `
  *,
  departure_start_at,
  departure_end_at,
  schedule_superseded_at,
  user:profiles!bookings_user_id_fkey(
    id,
    first_name,
    last_name,
    email
  ),
  tour_session:tour_sessions!bookings_session_id_fkey(
    start_at,
    end_at
  ),
  tour:tours!bookings_tour_id_fkey(
    id,
    title,
    slug,
    start_date,
    end_date,
    status,
    price_per_person
  )
`;

export type AdminBookingsListOptions = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  payment_status?: string;
};

async function findUserIdsBySearch(
  serviceClient: SupabaseClient,
  search: string
): Promise<string[]> {
  const q = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
  const { data } = await serviceClient
    .from('profiles')
    .select('id')
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(50);
  return (data ?? []).map((r) => String((r as { id: string }).id));
}

async function findTourIdsBySearch(
  serviceClient: SupabaseClient,
  search: string
): Promise<string[]> {
  const q = search.replace(/%/g, '\\%').replace(/_/g, '\\_');
  const { data } = await serviceClient
    .from('tours')
    .select('id')
    .ilike('title', `%${q}%`)
    .limit(50);
  return (data ?? []).map((r) => String((r as { id: string }).id));
}

function normalizeBookingRow(row: Record<string, unknown>) {
  const user = Array.isArray(row.user) ? row.user[0] : row.user;
  const tour = Array.isArray(row.tour) ? row.tour[0] : row.tour;
  const tour_session = Array.isArray(row.tour_session) ? row.tour_session[0] : row.tour_session;
  return { ...row, user, tour, tour_session };
}

function matchesEffectiveStatusFilter(row: Record<string, unknown>, status: string): boolean {
  if (status === 'all') return true;
  const normalized = normalizeBookingRow(row);
  const effective = getEffectiveBookingStatus(normalized as unknown as BookingForReview);
  return effective === status;
}

export async function listAdminBookings(
  serviceClient: SupabaseClient,
  rawOpts: AdminBookingsListOptions
) {
  const page = Math.max(1, rawOpts.page ?? 1);
  const limit = Math.min(Math.max(1, rawOpts.limit ?? 20), 50);
  const search = sanitizeText(rawOpts.search ?? '').trim();
  const status = sanitizeText(rawOpts.status ?? 'all').trim() || 'all';
  const paymentStatus = sanitizeText(rawOpts.payment_status ?? 'all').trim() || 'all';

  const needsEffectiveFilter = status !== 'all';

  if (needsEffectiveFilter) {
    const batchSize = 100;
    const maxScan = 3000;
    const matched: Record<string, unknown>[] = [];
    let scanOffset = 0;

    while (matched.length < page * limit && scanOffset < maxScan) {
      let query = serviceClient.from('bookings').select(BOOKING_SELECT);

      if (paymentStatus !== 'all') {
        query = query.eq('payment_status', paymentStatus);
      }

      if (search) {
        const [userIds, tourIds] = await Promise.all([
          findUserIdsBySearch(serviceClient, search),
          findTourIdsBySearch(serviceClient, search),
        ]);
        if (userIds.length === 0 && tourIds.length === 0) break;
        const parts: string[] = [];
        if (userIds.length) parts.push(`user_id.in.(${userIds.join(',')})`);
        if (tourIds.length) parts.push(`tour_id.in.(${tourIds.join(',')})`);
        query = query.or(parts.join(','));
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(scanOffset, scanOffset + batchSize - 1);

      if (error) throw error;
      const batch = (data ?? []) as Record<string, unknown>[];
      if (batch.length === 0) break;

      for (const row of batch) {
        if (matchesEffectiveStatusFilter(row, status)) {
          matched.push(normalizeBookingRow(row));
        }
      }
      scanOffset += batchSize;
    }

    const total = matched.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const start = (page - 1) * limit;

    return {
      bookings: matched.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages,
    };
  }

  let query = serviceClient.from('bookings').select(BOOKING_SELECT, { count: 'exact' });

  if (paymentStatus !== 'all') {
    query = query.eq('payment_status', paymentStatus);
  }

  if (search) {
    const [userIds, tourIds] = await Promise.all([
      findUserIdsBySearch(serviceClient, search),
      findTourIdsBySearch(serviceClient, search),
    ]);
    if (userIds.length === 0 && tourIds.length === 0) {
      return { bookings: [], total: 0, page, limit, totalPages: 0 };
    }
    const parts: string[] = [];
    if (userIds.length) parts.push(`user_id.in.(${userIds.join(',')})`);
    if (tourIds.length) parts.push(`tour_id.in.(${tourIds.join(',')})`);
    query = query.or(parts.join(','));
  }

  const offset = (page - 1) * limit;
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const total = count ?? 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    bookings: ((data ?? []) as Record<string, unknown>[]).map(normalizeBookingRow),
    total,
    page,
    limit,
    totalPages,
  };
}

export async function getAdminBookingsSummary(serviceClient: SupabaseClient) {
  const [{ count: total }, { count: pending }, { count: confirmed }, { count: paid }] =
    await Promise.all([
      serviceClient.from('bookings').select('*', { count: 'exact', head: true }),
      serviceClient
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      serviceClient
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed'),
      serviceClient
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'paid'),
    ]);

  return {
    total: total ?? 0,
    pending: pending ?? 0,
    confirmed: confirmed ?? 0,
    paid: paid ?? 0,
  };
}
