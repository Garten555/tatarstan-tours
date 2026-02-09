// API для управления конкретной картой
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE - Удалить карту
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    // Проверяем, что карта принадлежит пользователю
    const { data: card, error: checkError } = await supabase
      .from('user_cards')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError || !card) {
      return NextResponse.json(
        { error: 'Карта не найдена' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('user_cards')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Ошибка удаления карты:', error);
      return NextResponse.json(
        { error: 'Не удалось удалить карту' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Ошибка API удаления карты:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// PATCH - Обновить карту (например, установить как default)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const updateData = await request.json();

    // Если устанавливаем как default, снимаем default с других карт
    if (updateData.is_default === true) {
      await supabase
        .from('user_cards')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('id', id)
        .eq('is_default', true);
    }

    const { data: card, error } = await supabase
      .from('user_cards')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Ошибка обновления карты:', error);
      return NextResponse.json(
        { error: 'Не удалось обновить карту' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      card,
    });
  } catch (error) {
    console.error('Ошибка API обновления карты:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}























