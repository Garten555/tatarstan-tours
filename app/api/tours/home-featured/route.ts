import { NextResponse } from 'next/server';

import { getCachedActiveCatalogSnapshot } from '@/lib/tours/catalog-cache';
import { pickHomeFeaturedTours } from '@/lib/tours/active-catalog-listing';

/** Публичный JSON для блока «Популярные туры» (клиент + Pusher + таймер по start_at). */
export async function GET() {
  try {
    const snapshot = await getCachedActiveCatalogSnapshot();
    const featured = pickHomeFeaturedTours(snapshot.rows);

    return NextResponse.json(
      {
        tours: featured.tours,
        totalAvailableTours: featured.total,
        nextVisibilityChangeAt: snapshot.nextVisibilityChangeAt,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('GET /api/tours/home-featured:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
