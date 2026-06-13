import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchActiveCatalogSnapshot,
  pickHeroNearestTours,
} from '@/lib/tours/active-catalog-listing';

/** Публичный JSON для hero «Ближайший выезд» (клиент + Pusher refresh). */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const snapshot = await fetchActiveCatalogSnapshot(supabase);
    const tours = pickHeroNearestTours(snapshot.rows, 5, {
      sessionsByTourId: snapshot.sessionsByTourId,
    });

    return NextResponse.json(
      { tours, nextVisibilityChangeAt: snapshot.nextVisibilityChangeAt },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/tours/hero-nearest:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
