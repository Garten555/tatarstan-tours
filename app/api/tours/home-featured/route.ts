import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchActiveCatalogSnapshot,
  pickHomeFeaturedTours,
} from '@/lib/tours/active-catalog-listing';

/** Публичный JSON для блока «Популярные туры» (клиент + Pusher + таймер по start_at). */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const snapshot = await fetchActiveCatalogSnapshot(supabase);
    const featured = pickHomeFeaturedTours(snapshot.rows);

    return NextResponse.json(
      {
        tours: featured.tours,
        totalAvailableTours: featured.total,
        nextVisibilityChangeAt: snapshot.nextVisibilityChangeAt,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/tours/home-featured:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
