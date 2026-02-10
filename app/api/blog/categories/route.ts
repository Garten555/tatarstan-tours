// API для категорий блога
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET /api/blog/categories - Получить все категории
export async function GET(request: NextRequest) {
  try {
    const serviceClient = createServiceClient();

    const { data: categories, error } = await serviceClient
      .from('blog_categories')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching blog categories:', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить категории' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      categories: categories || [],
    });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}












