// API для получения конкретного города по ID
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceClient();

    const { data: city, error } = await supabase
      .from('cities')
      .select('id, name')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Ошибка загрузки города:', error);
      return NextResponse.json(
        { error: 'Город не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      city: city || null,
    });
  } catch (error) {
    console.error('Ошибка API города:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}























