export type AdminBookingPatch = {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'unpaid';
};

const BOOKING_STATUSES = new Set(['pending', 'confirmed', 'cancelled', 'completed']);
const PAYMENT_STATUSES = new Set(['pending', 'paid', 'failed', 'refunded', 'unpaid']);

/** Только разрешённые поля для PATCH /api/admin/bookings/[id]. */
export function sanitizeAdminBookingPatch(body: unknown): AdminBookingPatch {
  const src = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const out: AdminBookingPatch = {};

  if (typeof src.status === 'string' && BOOKING_STATUSES.has(src.status)) {
    out.status = src.status as AdminBookingPatch['status'];
  }
  if (typeof src.payment_status === 'string' && PAYMENT_STATUSES.has(src.payment_status)) {
    out.payment_status = src.payment_status as AdminBookingPatch['payment_status'];
  }

  return out;
}

export function adminBookingPatchToRow(patch: AdminBookingPatch): Record<string, string> {
  const row: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.status) row.status = patch.status;
  if (patch.payment_status) row.payment_status = patch.payment_status;
  return row;
}
