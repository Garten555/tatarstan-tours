// API для управления сохраненными картами пользователя
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Получить все карты пользователя
export async function GET(request: NextRequest) {
  try {
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

    const { data: cards, error } = await supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ошибка загрузки карт:', error);
      return NextResponse.json(
        { error: 'Не удалось загрузить карты' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      cards: cards || [],
    });
  } catch (error) {
    console.error('Ошибка API карт:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST - Сохранить новую карту
export async function POST(request: NextRequest) {
  try {
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

    const cardData = await request.json();
    const { last_four_digits, card_type, cardholder_name, is_default } = cardData;

    if (!last_four_digits || !card_type) {
      return NextResponse.json(
        { error: 'Не все обязательные поля заполнены' },
        { status: 400 }
      );
    }

    // Если устанавливаем как default, снимаем default с других карт
    if (is_default) {
      await supabase
        .from('user_cards')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true);
    }

    const { data: card, error } = await supabase
      .from('user_cards')
      .insert({
        user_id: user.id,
        last_four_digits,
        card_type,
        cardholder_name: cardholder_name || null,
        is_default: is_default || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка сохранения карты:', error);
      return NextResponse.json(
        { error: 'Не удалось сохранить карту' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      card,
    });
  } catch (error) {
    console.error('Ошибка API сохранения карты:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}






















