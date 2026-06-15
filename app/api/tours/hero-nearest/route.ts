import { NextResponse } from 'next/server';

import { getCachedActiveCatalogSnapshot } from '@/lib/tours/catalog-cache';
import { pickHeroNearestTours } from '@/lib/tours/active-catalog-listing';

/** Публичный JSON для hero «Ближайший выезд» (клиент + Pusher refresh). */
export async function GET() {
  try {
    const snapshot = await getCachedActiveCatalogSnapshot();
    const tours = pickHeroNearestTours(snapshot.rows, 5, {
      sessionsByTourId: snapshot.sessionsByTourId,
    });

    return NextResponse.json(
      { tours, nextVisibilityChangeAt: snapshot.nextVisibilityChangeAt },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=120',
        },
      }
    );  } catch (error) {
    console.error('GET /api/tours/hero-nearest:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
