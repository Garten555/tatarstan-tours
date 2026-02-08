import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'deepseek/deepseek-chat';
const VOWELS = /[aeiouyаеёиоуыэюя]/i;
const LETTERS = /[a-zа-яё]/gi;

// Список нецензурных слов для фильтрации (базовый набор)
const PROFANITY_WORDS = [
  // Русский мат
  'бля', 'блять', 'блядь', 'еб', 'ебать', 'ебу', 'хуй', 'хуя', 'пизд', 'пизда',
  'сука', 'суки', 'залупа', 'мудак', 'мудаки', 'долбоеб', 'долбоёб', 'еблан',
  'ебанутый', 'ебанутая', 'ебанутое', 'ебанутые', 'ебанный', 'ебанная', 'ебанное',
  'ебанные', 'ебан', 'ебаный', 'ебаная', 'ебаное', 'ебаные', 'ебануть', 'ебнуть',
  'ебанул', 'ебнул', 'ебанула', 'ебнула', 'ебанули', 'ебнули', 'ебанут', 'ебнут',
  'ебанется', 'ебнется', 'ебал', 'ебала', 'ебали', 'ебало', 'ебать', 'ебаться',
  'ебется', 'ебутся', 'ебут', 'ебу', 'ебешь', 'ебет', 'ебе', 'ебешься', 'ебется',
  'ебем', 'ебете', 'ебут', 'ебемся', 'ебетесь', 'ебутся', 'ебаный', 'ебаная',
  'ебаное', 'ебаные', 'ебать', 'ебаться', 'ебануть', 'ебнуть', 'ебанул', 'ебнул',
  // Английский мат
  'fuck', 'fucking', 'fucked', 'shit', 'damn', 'bitch', 'ass', 'asshole',
  'bastard', 'cunt', 'dick', 'piss', 'pussy', 'whore', 'slut',
].map(word => word.toLowerCase());

// Функция проверки на мат
function containsProfanity(text: string): boolean {
  const lowerText = text.toLowerCase();
  // Удаляем знаки препинания для проверки
  const cleanText = lowerText.replace(/[^\wа-яё]/gi, ' ');
  const words = cleanText.split(/\s+/);
  
  for (const word of words) {
    if (word.length < 3) continue; // Пропускаем короткие слова
    for (const profanity of PROFANITY_WORDS) {
      if (word.includes(profanity) || profanity.includes(word)) {
        return true;
      }
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const limiter = rateLimit(request, { windowMs: 60_000, maxRequests: 5 });
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Слишком много запросов. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': Math.ceil((limiter.resetTime - Date.now()) / 1000).toString() } }
      );
    }

    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const body = await request.json();
    let message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
    }
    if (message.length > 1500) {
      return NextResponse.json({ error: 'Сообщение слишком длинное' }, { status: 400 });
    }

    // Проверка на мат - если обнаружен, отправляем в ИИ с пометкой о нецензурной лексике
    // но не блокируем, пусть ИИ сам решает как ответить
    const hasProfanity = containsProfanity(message);
    if (hasProfanity) {
      message = '[Сообщение содержит нецензурную лексику] ' + message;
    }

    // Проверка на бессмысленный набор букв - отправляем в ИИ, пусть сам решает
    const letters = (message.match(LETTERS) || []).join('');
    const vowels = (message.match(VOWELS) || []).length;
    const looksLikeGibberish = letters.length >= 6 && vowels === 0;
    if (looksLikeGibberish) {
      message = '[Возможно, набор букв] ' + message;
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI сервис недоступен' }, { status: 503 });
    }

    // Получаем туры с полной информацией
    const { data: tours } = await (serviceClient as any)
      .from('tours')
      .select(`
        id,
        title,
        slug,
        description,
        start_date,
        end_date,
        price_per_person,
        max_participants,
        current_participants,
        city:cities(name),
        category:tour_categories(name)
      `)
      .order('start_date', { ascending: true })
      .limit(30);

    // Получаем города
    const { data: cities } = await (serviceClient as any)
      .from('cities')
      .select('id, name')
      .limit(50);

    // Получаем категории туров
    const { data: categories } = await (serviceClient as any)
      .from('tour_categories')
      .select('id, name, description')
      .limit(20);

    // Получаем историю сообщений для контекста (последние 10 сообщений)
    const { data: messageHistory } = await (serviceClient as any)
      .from('chat_messages')
      .select('message, is_support, is_ai, created_at')
      .eq('session_id', user.id)
      .eq('is_ai', true)
      .order('created_at', { ascending: false })
      .limit(10);

    // Формируем историю для контекста (в обратном порядке, от старых к новым)
    const conversationHistory = (messageHistory || [])
      .reverse()
      .map((msg: any) => ({
        role: msg.is_support ? 'assistant' : 'user',
        content: msg.message,
      }))
      .slice(0, -1); // Исключаем текущее сообщение, если оно есть

    // Формируем контекст туров
    const toursContext = (tours || [])
      .map((t: any, idx: number) => {
        const startDate = t.start_date ? new Date(t.start_date).toLocaleDateString('ru-RU') : 'без даты';
        const endDate = t.end_date ? new Date(t.end_date).toLocaleDateString('ru-RU') : '';
        const city = t.city?.name ? `, ${t.city.name}` : '';
        const category = t.category?.name ? `, категория: ${t.category.name}` : '';
        const participants = t.max_participants 
          ? `, мест: ${t.current_participants || 0}/${t.max_participants}` 
          : '';
        const description = t.description ? ` (${t.description.substring(0, 100)}...)` : '';
        return `${idx + 1}. ${t.title}${description} — ${startDate}${endDate ? ` - ${endDate}` : ''}${city}${category}${participants}, от ${t.price_per_person} ₽, ссылка: /tours/${t.slug}`;
      })
      .join('\n');

    // Формируем список городов
    const citiesList = (cities || [])
      .map((c: any) => c.name)
      .join(', ');

    // Формируем список категорий
    const categoriesList = (categories || [])
      .map((c: any) => `${c.name}${c.description ? ` (${c.description})` : ''}`)
      .join('\n');

    const systemPrompt = [
      'Ты умный и дружелюбный виртуальный помощник сайта туров по Татарстану.',
      'Твое имя: "Татар Гид". Представляйся по-русски и общайся вежливо, профессионально и дружелюбно.',
      '',
      'ТВОИ ЗАДАЧИ:',
      '1. Помогать пользователям выбирать подходящие туры на основе их запросов',
      '2. Объяснять детали туров: даты, цены, города, категории, количество мест',
      '3. Рассказывать о шагах бронирования тура',
      '4. Отвечать на вопросы о путешествиях по Татарстану',
      '5. Предлагать альтернативные варианты, если конкретный тур не подходит',
      '',
      'ВАЖНЫЕ ПРАВИЛА:',
      '- НИКОГДА не используй мат, оскорбления, грубые выражения или нецензурную лексику',
      '- НИКОГДА не выдумывай туры, даты, цены или информацию - используй ТОЛЬКО данные из списка ниже',
      '- Если тура нет в списке - честно скажи об этом и предложи похожие варианты',
      '- Если запрос непонятен или похож на набор букв - вежливо попроси уточнить вопрос',
      '- Если не знаешь ответа - предложи открыть страницу туров (/tours) или задать уточняющий вопрос',
      '- Всегда указывай точные цены, даты и ссылки на туры из списка',
      '- Будь конкретным и полезным в ответах',
      '- На простые приветствия (привет, здравствуйте, добрый день) отвечай КОРОТКО и естественно, не перегружай информацией',
      '- На вопросы о турах давай развернутые ответы с конкретными данными',
      '',
      'ДОСТУПНЫЕ ГОРОДА:',
      citiesList || 'Города не найдены.',
      '',
      'КАТЕГОРИИ ТУРОВ:',
      categoriesList || 'Категории не найдены.',
      '',
      'СПИСОК ДОСТУПНЫХ ТУРОВ:',
      toursContext || 'Туры не найдены.',
      '',
      'ВАЖНО:',
      '- Отвечай ЕСТЕСТВЕННО и РАЗНООБРАЗНО, не используй заготовленные фразы',
      '- Каждый ответ должен быть уникальным и подходить к конкретному вопросу пользователя',
      '- На простые приветствия отвечай коротко (1-2 предложения)',
      '- На вопросы о турах давай развернутые ответы с конкретными данными из списка',
      '- Если пользователь использует нецензурную лексику - вежливо попроси общаться культурно, но не будь слишком строгим',
      '- Если сообщение похоже на набор букв - вежливо попроси уточнить вопрос',
      '',
      'Помни: ты должен быть полезным, точным, вежливым и ЕСТЕСТВЕННЫМ помощником!',
    ].join('\n');

    const aiResponse = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Tatar Tours Support Bot',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory, // Добавляем историю разговора для контекста
          { role: 'user', content: message },
        ],
        temperature: 0.8, // Увеличиваем для более разнообразных ответов
        max_tokens: 800,
        top_p: 0.95,
        frequency_penalty: 0.3, // Штраф за повторения, чтобы избежать шаблонов
        presence_penalty: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text().catch(() => '');
      console.error('OpenRouter error:', aiResponse.status, errorText);
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === 'production'
              ? 'AI сервис временно недоступен. Попробуйте позже.'
              : `OpenRouter error ${aiResponse.status}: ${errorText || 'Unknown'}`,
        },
        { status: 502 }
      );
    }

    const aiData = await aiResponse.json();
    let aiText =
      aiData?.choices?.[0]?.message?.content ||
      aiData?.choices?.[0]?.text ||
      '';

    if (!aiText) {
      console.error('OpenRouter empty response:', aiData);
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === 'production'
              ? 'AI сервис вернул пустой ответ. Попробуйте позже.'
              : `OpenRouter empty response: ${JSON.stringify(aiData)}`,
        },
        { status: 502 }
      );
    }

    // Проверяем ответ ИИ на мат - если обнаружен, заменяем на вежливый ответ
    if (containsProfanity(aiText)) {
      aiText = 'Извините, я не могу ответить на этот вопрос. Пожалуйста, задайте вопрос о турах по Татарстану, и я с радостью помогу вам.';
    }

    const now = new Date().toISOString();

    const { data: inserted, error: insertError } = await (serviceClient as any)
      .from('chat_messages')
      .insert([
        {
          user_id: user.id,
          session_id: user.id,
          message,
          is_support: false,
          is_ai: true,
          created_at: now,
        },
        {
          user_id: user.id,
          session_id: user.id,
          message: aiText,
          is_support: true,
          is_ai: true,
          created_at: now,
        },
      ])
      .select('id, message, is_support, is_ai, created_at')
      .order('created_at', { ascending: true });

    if (insertError) {
      console.error('Ошибка сохранения AI сообщений:', insertError);
      return NextResponse.json(
        { error: 'Не удалось сохранить сообщения' },
        { status: 500 }
      );
    }

    // ИИ работает через OpenRouter API, не использует Pusher
    // Клиент сам обновит интерфейс на основе возвращенных данных
    return NextResponse.json({ success: true, messages: inserted || [] });
  } catch (error) {
    console.error('Ошибка AI поддержки:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    // Удаляем все сообщения ИИ для текущего пользователя (и от пользователя, и от ИИ)
    const { error } = await (serviceClient as any)
      .from('chat_messages')
      .delete()
      .eq('session_id', user.id)
      .eq('is_ai', true);

    if (error) {
      console.error('Ошибка удаления сообщений ИИ:', error);
      return NextResponse.json({ error: 'Не удалось очистить чат' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка очистки AI чата:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

