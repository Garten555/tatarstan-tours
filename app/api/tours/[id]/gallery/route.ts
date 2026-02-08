// API для получения галереи тура
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const serviceClient = createServiceClient();

    // Получаем только изображения из галереи тура
    const { data: media, error } = await serviceClient
      .from('tour_media')
      .select('media_url')
      .eq('tour_id', id)
      .in('media_type', ['image', 'photo'])
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[Tour Gallery API] Ошибка получения галереи:', error);
      return NextResponse.json(
        { success: true, images: [] }, // Возвращаем пустой массив вместо ошибки
      );
    }

    // Фильтруем только валидные URL
    const images = (media || [])
      .map((m: any) => m.media_url)
      .filter((url: string) => url && typeof url === 'string' && url.startsWith('http'));

    return NextResponse.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error('[Tour Gallery API] Ошибка получения галереи:', error);
    return NextResponse.json(
      { success: true, images: [] }, // Возвращаем пустой массив вместо ошибки
    );
  }
}

