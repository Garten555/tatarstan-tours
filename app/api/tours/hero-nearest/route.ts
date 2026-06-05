import { NextResponse } from 'next/server';

import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchActiveCatalogTourRows,
  pickHeroNearestTours,
} from '@/lib/tours/active-catalog-listing';

/** Публичный JSON для hero «Ближайший выезд» (клиент + Pusher refresh). */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const catalogRows = await fetchActiveCatalogTourRows(supabase);
    const tours = pickHeroNearestTours(catalogRows, 5);

    return NextResponse.json(
      { tours },
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
